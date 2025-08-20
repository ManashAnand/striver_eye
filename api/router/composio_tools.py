from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
from api.supabase import get_supabase_client
import tempfile
import subprocess
import os

from openai import OpenAI
from composio import Composio
from composio_openai import OpenAIProvider


router = APIRouter(prefix="/api")

# Initialize once at import time
composio = Composio(provider=OpenAIProvider())
openai = OpenAI()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    user_id: str
    messages: List[ChatMessage]
    toolkits: Optional[List[str]] = ["HACKERNEWS"]
    model: Optional[str] = "gpt-4o"


def _sum_two_numbers_tool_schema() -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": "sum_two_numbers",
            "description": "Return the sum of two numbers a and b.",
            "parameters": {
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "First number"},
                    "b": {"type": "number", "description": "Second number"},
                },
                "required": ["a", "b"],
                "additionalProperties": False,
            },
        },
    }


def _maybe_handle_local_sum_tool(completion: Any) -> Optional[str]:
    try:
        choice = completion.choices[0]
        tool_calls = getattr(getattr(choice, "message", None), "tool_calls", None)
        if not tool_calls:
            return None
        for call in tool_calls:
            fn = getattr(call, "function", None)
            if not fn:
                continue
            name = getattr(fn, "name", None)
            if name != "sum_two_numbers":
                continue
            args_raw = getattr(fn, "arguments", "{}")
            try:
                args = json.loads(args_raw or "{}")
            except Exception:
                args = {}
            a = float(args.get("a", 0))
            b = float(args.get("b", 0))
            return f"The sum of {a} and {b} is {a + b}."
        return None
    except Exception:
        return None


def _get_problem_by_id_tool_schema() -> Dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": "get_problem_by_id",
            "description": "Fetch a problem row from Supabase 'problems' table by its numeric id and summarize it for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer", "minimum": 1, "description": "Problem id from the URL, e.g., /chatbot/135 -> 135"},
                },
                "required": ["id"],
                "additionalProperties": False,
            },
        },
    }


async def _maybe_handle_local_problem_tool(completion: Any) -> Optional[str]:
    try:
        choice = completion.choices[0]
        tool_calls = getattr(getattr(choice, "message", None), "tool_calls", None)
        if not tool_calls:
            return None
        for call in tool_calls:
            fn = getattr(call, "function", None)
            if not fn:
                continue
            name = getattr(fn, "name", None)
            if name != "get_problem_by_id":
                continue
            args_raw = getattr(fn, "arguments", "{}")
            try:
                args = json.loads(args_raw or "{}")
            except Exception:
                args = {}
            problem_id = int(args.get("id", 0))
            if problem_id <= 0:
                return "I need a valid positive problem id to fetch details."
            try:
                db = await get_supabase_client()
                resp = await db.table("problems").select("*").eq("id", problem_id).limit(1).execute()
                rows = resp.data or []
                if not rows:
                    return f"I could not find a problem with id {problem_id}."
                row = rows[0]
                question = row.get("question") or "(no question)"
                markdown = row.get("markdown") or row.get("answer") or ""
                code = row.get("code") or ""
                explanation = row.get("explanation") or ""
                preview = (markdown or "").strip()
                if len(preview) > 800:
                    preview = preview[:800] + "..."
                # Markdown-formatted response
                response = f"## Problem {problem_id}: {question}\n\n"
                response += f"**Summary:**\n\n{preview}\n\n"
                if code:
                    response += f"---\n**Code Example:**\n\n```cpp\n{code}\n```\n\n"
                if explanation:
                    response += f"---\n**Explanation:**\n\n{explanation}\n"
                return response
            except Exception as e:
                return f"An error occurred while fetching the problem: {str(e)}"
        return None
    except Exception:
        return None


@router.post("/tools/chat")
async def chat_with_tools(req: ChatRequest) -> Dict[str, Any]:
    try:
        tools = composio.tools.get(user_id=req.user_id, toolkits=req.toolkits or [])
        tools = tools + [_sum_two_numbers_tool_schema(), _get_problem_by_id_tool_schema()]

        formatting_system = {
            "role": "system",
            "content": (
                "When you include C++ code: 1) Use GitHub-flavored Markdown fenced code blocks with the language identifier cpp, "
                "2) Put the main code block before explanations, 3) Keep explanations concise (bullets preferred), "
                "4) Avoid extra prose and avoid nesting code fences inside quotes, 5) Ensure snippets are compilable where possible."
            ),
        }

        ordered_messages = [formatting_system] + [m.model_dump() for m in req.messages]

        completion = openai.chat.completions.create(
            model=req.model or "gpt-4o",
            messages=ordered_messages,
            tools=tools,
        )

        # Try to let composio handle tool calls, but ignore 'tool not found' errors
        try:
            result = composio.provider.handle_tool_calls(
                response=completion, user_id=req.user_id
            )
        except Exception as e:
            # If the error is about tool not found, ignore and let local handler take over
            result = None

        # Handle local custom tool calls (e.g., sum_two_numbers, get_problem_by_id)
        local_text = _maybe_handle_local_sum_tool(completion)
        if not local_text:
            local_text = await _maybe_handle_local_problem_tool(completion)

        # Try to produce a sensible assistant text for UI
        assistant_text = None
        try:
            choice = completion.choices[0]
            if getattr(choice, "message", None) and getattr(choice.message, "content", None):
                assistant_text = choice.message.content
        except Exception:
            assistant_text = None

        if not assistant_text:
            # Fallback to stringified result
            try:
                assistant_text = str(result)
            except Exception:
                assistant_text = ""

        # Prefer local custom tool response text if available
        if local_text:
            assistant_text = local_text

        return {
            "ok": True,
            "assistant_text": assistant_text,
            "result": result,
            "raw": completion.model_dump() if hasattr(completion, "model_dump") else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Native C++ compile & run API
# ---------------------------

class CppRunRequest(BaseModel):
    code: str
    args: Optional[List[str]] = None
    stdin: Optional[str] = None
    timeout_sec: Optional[int] = 5


@router.post("/compile-run-cpp")
def compile_run_cpp(req: CppRunRequest) -> Dict[str, Any]:
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            cpp_path = os.path.join(tmpdir, "main.cpp")
            bin_path = os.path.join(tmpdir, "main")
            with open(cpp_path, "w") as f:
                f.write(req.code or "")

            # Try common compilers/paths (macOS often has clang++ at /usr/bin/clang++; Homebrew at /opt/homebrew/opt/llvm/bin/clang++)
            compile_cmds = [
                ["clang++", "-std=c++17", "-O2", "-o", bin_path, cpp_path],
                ["/usr/bin/clang++", "-std=c++17", "-O2", "-o", bin_path, cpp_path],
                ["/opt/homebrew/opt/llvm/bin/clang++", "-std=c++17", "-O2", "-o", bin_path, cpp_path],
                ["g++", "-std=c++17", "-O2", "-o", bin_path, cpp_path],
            ]

            compile_ok = False
            compile_stdout = ""
            compile_stderr = ""
            for cmd in compile_cmds:
                try:
                    proc = subprocess.run(
                        cmd,
                        cwd=tmpdir,
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    compile_stdout = proc.stdout
                    compile_stderr = proc.stderr
                    if proc.returncode == 0:
                        compile_ok = True
                        break
                except FileNotFoundError:
                    # Compiler not found, try next
                    continue

            if not compile_ok:
                return {
                    "ok": False,
                    "stage": "compile",
                    "stdout": compile_stdout,
                    "stderr": compile_stderr or "C++ compiler not found (g++/clang++). Install Xcode Command Line Tools or GCC.",
                    "exit_code": 1,
                }

            run_cmd = [bin_path] + (req.args or [])
            try:
                proc = subprocess.run(
                    run_cmd,
                    cwd=tmpdir,
                    input=req.stdin or None,
                    capture_output=True,
                    text=True,
                    timeout=max(1, int(req.timeout_sec or 5)),
                )
                return {
                    "ok": proc.returncode == 0,
                    "stage": "run",
                    "stdout": proc.stdout,
                    "stderr": proc.stderr,
                    "exit_code": proc.returncode,
                }
            except subprocess.TimeoutExpired as e:
                return {
                    "ok": False,
                    "stage": "run",
                    "stdout": e.stdout or "",
                    "stderr": (e.stderr or "") + "\nTimed out.",
                    "exit_code": 124,
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

