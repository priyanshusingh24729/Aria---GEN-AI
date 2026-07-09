"""Chat endpoints: general chat (POST /general) and document RAG chat (POST /rag).

Both stream their answer over Server-Sent Events using the generators in
chat_service.py and document_service.py.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage

from app.auth.supabase_jwt import get_current_user
from app.schemas.chat import GeneralChatRequest, RagChatRequest
from app.services.chat_service import stream_general_answer
from app.services.document_service import get_retriever, stream_rag_answer
from app.utils.streaming import sse_done, sse_error, sse_event

router = APIRouter()


def _to_lc_history(messages) -> list:
    """Convert a list of ChatMessage pydantic models into LangChain message objects."""
    history = []
    for m in messages:
        if m.role == "user":
            history.append(HumanMessage(content=m.content))
        else:
            history.append(AIMessage(content=m.content))
    return history


@router.post("/general")
async def chat_general(payload: GeneralChatRequest, user: dict = Depends(get_current_user)):
    """
    Streaming SSE endpoint for general chat.

    Event sequence:
      event: chunk  data: {"content": "..."}   (repeated, one per token)
      event: done   data: {"done": true}        (terminal, success)
      event: error  data: {"error": "..."}      (terminal, on failure — replaces done)
    """
    history = _to_lc_history(payload.history)

    def event_stream():
        try:
            for event in stream_general_answer(payload.query, history):
                yield sse_event("chunk", {"content": event["content"]})
            yield sse_done()
        except Exception as e:
            yield sse_error(str(e))

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/rag")
async def chat_rag(payload: RagChatRequest, user: dict = Depends(get_current_user)):
    """
    Streaming SSE endpoint for RAG-based document chat.

    Event sequence:
      event: chunk    data: {"content": "..."}                                  (repeated)
      event: sources  data: {"sources": [{content, source_file, page}, ...]}     (once, after chunks)
      event: done     data: {"done": true}                                       (terminal, success)
      event: error    data: {"error": "..."}                                     (terminal, on failure)
    """
    retriever = get_retriever(k=4, fetch_k=12, lambda_mult=0.5)
    if retriever is None:
        def error_stream():
            yield sse_error("Vector database not available. Upload and process documents first.")
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    history = _to_lc_history(payload.history)

    def event_stream():
        try:
            for event in stream_rag_answer(payload.query, retriever, history):
                if event["type"] == "chunk":
                    yield sse_event("chunk", {"content": event["content"]})
                else:
                    yield sse_event("sources", {"sources": event["sources"]})
            yield sse_done()
        except Exception as e:
            yield sse_error(str(e))

    return StreamingResponse(event_stream(), media_type="text/event-stream")
