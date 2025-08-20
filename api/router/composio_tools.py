from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json

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


@router.post("/tools/chat")
async def chat_with_tools(req: ChatRequest) -> Dict[str, Any]:
    try:
        tools = composio.tools.get(user_id=req.user_id, toolkits=req.toolkits or [])
        tools = tools + [_sum_two_numbers_tool_schema()]

        completion = openai.chat.completions.create(
            model=req.model or "gpt-4o",
            messages=[m.model_dump() for m in req.messages],
            tools=tools,
        )

        # Execute the function calls if present
        result = composio.provider.handle_tool_calls(
            response=completion, user_id=req.user_id
        )

        # Handle local custom tool calls (e.g., sum_two_numbers)
        local_text = _maybe_handle_local_sum_tool(completion)

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


