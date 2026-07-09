"""SSE streaming helpers.

These four small functions replace every instance of
``response_placeholder = st.empty()`` + ``response_placeholder.markdown(...)``
from the original app.py. Each formats one Server-Sent Events frame.

If streaming protocol ever changes (e.g. to WebSockets), only these
functions need to change — every endpoint that calls them stays the same.
"""
import json
from typing import Any


def sse_event(event: str, data: dict[str, Any]) -> str:
    """Format a single named SSE event frame, e.g. 'event: chunk\\ndata: {...}\\n\\n'."""
    payload = json.dumps(data, default=str)
    return f"event: {event}\ndata: {payload}\n\n"


def sse_done() -> str:
    """Terminal SSE frame signalling a stream completed successfully."""
    return sse_event("done", {"done": True})


def sse_error(message: str) -> str:
    """Terminal SSE frame carrying an error message, used instead of sse_done() on failure."""
    return sse_event("error", {"error": message})
