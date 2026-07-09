"""General Chat service.

Direct port of answer_question_general() from app.py. The only change is
that the st.empty()/response_placeholder.markdown() loop becomes a
generator yielding chunks for the API layer to forward over SSE.

Note: in the original app.py, a system_msg + messages list (with the
"You are Aria..." system prompt) was built but never actually passed to
llm.stream() — only lc_messages (history + the new HumanMessage, with no
system prompt) was used. That looks like an unintentional bug in the
original code, but since it doesn't fall under any of the four points we
agreed to change, this port preserves the exact same effective behaviour
(no system prompt applied) rather than silently fixing it. Flagging this
in case you'd like it corrected in a follow-up.
"""
from typing import Generator

from langchain_core.messages import HumanMessage
from langchain_mistralai import ChatMistralAI

from app.config.settings import get_settings

settings = get_settings()


def stream_general_answer(query: str, history: list) -> Generator[dict, None, None]:
    """
    Stream a general-chat answer chunk-by-chunk.

    history: list of HumanMessage/AIMessage objects for prior turns
             (the current query is appended internally, matching app.py).
    Yields: {"type": "chunk", "content": str} once per streamed token.
    """
    llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.7, streaming=True)

    lc_messages = history + [HumanMessage(content=query)]

    for chunk in llm.stream(lc_messages):
        if chunk.content:
            yield {"type": "chunk", "content": chunk.content}
