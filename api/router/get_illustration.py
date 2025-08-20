from fastapi import APIRouter, Query, Depends, HTTPException
from supabase import Client
from api.supabase import get_supabase_client
from typing import Optional
import os
import re
from openai import OpenAI

router = APIRouter(prefix="/api")


import re, hashlib, base64


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9\-]+", "-", (s or "").lower()).strip("-")


def _short_hash(s: str) -> str:
    h = hashlib.sha256((s or "").encode()).digest()
    return base64.urlsafe_b64encode(h[:8]).decode().rstrip("=")


import tempfile, subprocess, os


def render_manim_scene(code: str, scene_class: str = "AlgoVizScene") -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        py_path = os.path.join(tmpdir, "scene.py")
        with open(py_path, "w") as f:
            f.write(code)

        out_name = "illustration.mp4"
        cmd = ["manim", "-qm", py_path, scene_class, "-o", out_name]
        subprocess.run(cmd, cwd=tmpdir, check=True)

        final_path = os.path.join(
            tmpdir, "media", "videos", "scene", "720p30", out_name
        )
        if not os.path.exists(final_path):
            raise FileNotFoundError(f"Manim output missing: {final_path}")

        tmpfile = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
        with open(final_path, "rb") as src, open(tmpfile.name, "wb") as dst:
            dst.write(src.read())
        return tmpfile.name


from supabase import AsyncClient


# helper (async)
async def upload_to_supabase(
    local_path: str,
    bucket: str,
    key: str,
    supabase: AsyncClient,  # injected async client
    expires_in: int = 3600,
) -> str:
    bucket_ref = supabase.storage.from_(bucket)
    # Upload file contents (async SDK expects a file-like or bytes)
    with open(local_path, "rb") as f:
        await bucket_ref.upload(
            key,
            f,
            {"content-type": "video/mp4", "upsert": "true"},
        )
    signed = await bucket_ref.create_signed_url(key, expires_in)
    return signed.get("signedURL") or signed.get("signed_url")


def build_prompt_from_markdown(question: str, markdown: str) -> str:
    return f"""
You are a senior Manim Community Edition developer. Output ONLY ONE Python code block with a COMPLETE, runnable scene.

Use exactly: from manim import *
Define exactly one scene class: AlgoVizScene(Scene)
Use Text (no LaTeX). No prose outside the code block.

Pick a tiny deterministic demo INSIDE the scene (e.g., _example()).
Aim for ~20–30 seconds with ≥ 8 calls to self.wait(2).

Keep labels readable; text above shapes (z-index). Use SurroundingRectangle(YELLOW, stroke_width=6) to highlight.
If a node/box becomes GREEN, set its text to WHITE. Use named/hex colors only.

Maintain a single status_text at top (to_edge(UP)) and always update with:
Transform(status_text, new_text.move_to(status_text.get_center()))

Here is the full problem context (question, explanation, code). Do NOT execute it; derive a minimal faithful visualization:
QUESTION:
{question}

MARKDOWN:
{markdown}

Return only one Python code block defining AlgoVizScene that follows all rules.

Never pass a positional color to SurroundingRectangle; always use `color=...`.
Never Transform a node into a SurroundingRectangle. Instead, do:
sr = SurroundingRectangle(node, color=YELLOW, stroke_width=6); self.play(Create(sr)); self.wait(2); self.play(FadeOut(sr)).

"""


def _extract_code_block(text: str) -> str:
    m = re.search(r"```(?:python)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if not m:
        raise RuntimeError("LLM did not return a Python code block.")
    return m.group(1)


def _validate_manim_code(code: str) -> Optional[str]:
    problems = []
    if "class AlgoVizScene" not in code:
        problems.append("AlgoVizScene class missing")
    if "from manim import *" not in code:
        problems.append("Missing 'from manim import *'")
    if re.search(r"color\s*=\s*[-+]?\d+(\.\d+)?", code):
        problems.append("Numeric passed to color= is not allowed")
    waits = len(re.findall(r"\bself\.wait\(\s*2\s*\)", code))
    if waits < 8:
        problems.append(f"Only {waits} calls to self.wait(2). Prefer 8 or more")
    return "; ".join(problems) if problems else None


def _sanitize_manim_code(code: str) -> str:
    """Best-effort fixups for common non-animated operations passed to self.play.

    Converts patterns like obj.set_fill(...), obj.set_color(...), obj.move_to(...)
    used inside self.play(...) into obj.animate.set_fill(...), etc.
    Only transforms occurrences on lines that contain "self.play(" to avoid
    altering object initialization chains.
    """
    def replace_set_calls(line: str) -> str:
        # Replace foo.set_xxx( -> foo.animate.set_xxx( when not already animated
        return re.sub(
            r"(?<!animate\.)(([A-Za-z_][A-Za-z0-9_\.]*)\.set_([A-Za-z0-9_]+)\()",
            lambda m: f"{m.group(2)}.animate.set_{m.group(3)}(",
            line,
        )

    def replace_motion_calls(line: str) -> str:
        # Replace common transform-like methods to their animate variants
        return re.sub(
            r"(?<!animate\.)(([A-Za-z_][A-Za-z0-9_\.]*)\.(move_to|shift|scale|rotate|next_to|stretch|to_edge|arrange|align_to)\()",
            lambda m: f"{m.group(2)}.animate.{m.group(3)}(",
            line,
        )

    # Process line-by-line to keep the transformation scoped to play calls
    sanitized_lines = []
    for original_line in code.splitlines():
        if "self.play(" in original_line:
            new_line = replace_set_calls(original_line)
            new_line = replace_motion_calls(new_line)
            sanitized_lines.append(new_line)
        else:
            sanitized_lines.append(original_line)
    return "\n".join(sanitized_lines)


@router.get("/get-illustration")
async def get_illustration(
    id: str = Query(..., min_length=1),
    render: bool = Query(True),  # set True to render+upload by default
    bucket: str = Query("illustrations"),
    db: Client = Depends(get_supabase_client),
):
    # fetch row
    try:
        resp = (
            await db.table("problems").select("*").eq("id", id).limit(1).execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Supabase query failed") from e

    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Problem not found")

    row = rows[0]
    question = row.get("question") or ""
    markdown = row.get("markdown") or row.get("answer") or ""
    if not markdown:
        raise HTTPException(
            status_code=400, detail="Problem row missing markdown/explanation"
        )

    # build prompt from markdown
    prompt = build_prompt_from_markdown(question, markdown)

    # call OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    chat = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": "You generate clean, runnable Manim CE scenes.",
            },
            {"role": "user", "content": prompt},
        ],
    )

    raw = chat.choices[0].message.content or ""
    code = _extract_code_block(raw)
    warning = _validate_manim_code(code)

    result = {"question": question, "code": code, "warning": warning}

    if render:
        try:
            # Best-effort sanitization to convert non-animated operations
            # accidentally passed to self.play into animate calls.
            safe_code = _sanitize_manim_code(code)
            mp4_path = render_manim_scene(safe_code, "AlgoVizScene")
            key = f"algo-viz/{_slug(question)}/{_short_hash(code)}.mp4"

            signed_url = await upload_to_supabase(mp4_path, "illustrations", key, db)

            result.update({"video_url": signed_url, "storage_key": key})
        except Exception as e:
            result.update({"render_error": str(e)})

    return result


@router.get("/get-illustration-by-id")
async def get_illustration_by_id(
    id: str = Query(..., min_length=1),
    render: bool = Query(True),
    bucket: str = Query("illustrations"),
    db: Client = Depends(get_supabase_client),
):
    # Alias endpoint to support existing frontend calls
    return await get_illustration(id=id, render=render, bucket=bucket, db=db)