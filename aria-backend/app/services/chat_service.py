# """General Chat service.

# Direct port of answer_question_general() from app.py. The only change is
# that the st.empty()/response_placeholder.markdown() loop becomes a
# generator yielding chunks for the API layer to forward over SSE.

# Note: in the original app.py, a system_msg + messages list (with the
# "You are Aria..." system prompt) was built but never actually passed to
# llm.stream() — only lc_messages (history + the new HumanMessage, with no
# system prompt) was used. That looks like an unintentional bug in the
# original code, but since it doesn't fall under any of the four points we
# agreed to change, this port preserves the exact same effective behaviour
# (no system prompt applied) rather than silently fixing it. Flagging this
# in case you'd like it corrected in a follow-up.
# """
# from typing import Generator

# from langchain_core.messages import HumanMessage
# from langchain_mistralai import ChatMistralAI

# from app.config.settings import get_settings

# settings = get_settings()


# def stream_general_answer(query: str, history: list) -> Generator[dict, None, None]:
#     """
#     Stream a general-chat answer chunk-by-chunk.

#     history: list of HumanMessage/AIMessage objects for prior turns
#              (the current query is appended internally, matching app.py).
#     Yields: {"type": "chunk", "content": str} once per streamed token.
#     """
#     llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.7, streaming=True)

#     lc_messages = history + [HumanMessage(content=query)]

#     for chunk in llm.stream(lc_messages):
#         if chunk.content:
#             yield {"type": "chunk", "content": chunk.content}
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

Person lookup: a small hardcoded knowledge base for specific known
individuals (e.g. "Jazz"). If the query matches one of their aliases,
we short-circuit the LLM entirely and yield a canned answer + image
instead. This keeps the general-chat path untouched for everything else.
"""
from typing import Generator, Optional

from langchain_core.messages import HumanMessage
from langchain_mistralai import ChatMistralAI

from app.config.settings import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Known-person knowledge base (hardcoded; move to app/data/people.json + a
# loader if this list grows beyond a handful of entries).
# ---------------------------------------------------------------------------
IMAGE_URL_PREFIX = "/static/people"  # adjust to match your actual static mount

KNOWN_PEOPLE = {
    "jaspreet_singh": {
        "name": "Jaspreet Singh",
        "aliases": ["jaspreet singh", "jaspreet", "jazz", "jassu"],
        "esports_team": "Volume Zero Esports",
        "education": "B.Tech in Mechanical Engineering",
        "birthday": "24 August 2004",
        "image_file": "jaspreet_singh.jpeg",
    },
}


def _find_known_person(query: str) -> Optional[dict]:
    """Return the matching person record if any alias appears in the query."""
    query_lower = query.lower()
    for person_id, record in KNOWN_PEOPLE.items():
        if any(alias in query_lower for alias in record["aliases"]):
            return {**record, "id": person_id}
    return None


def _format_person_answer(record: dict) -> str:
    nicknames = ", ".join(record["aliases"][2:])  # skip full name + first-name alias
    return (
        f"{record['name']} (aka {nicknames}) is an esports player for "
        f"{record['esports_team']}. He's also a {record['education']} graduate, "
        f"born on {record['birthday']}."
    )


def _person_image_url(record: dict) -> str:
    return f"{IMAGE_URL_PREFIX}/{record['image_file']}"


def stream_general_answer(query: str, history: list) -> Generator[dict, None, None]:
    """
    Stream a general-chat answer chunk-by-chunk.

    history: list of HumanMessage/AIMessage objects for prior turns
             (the current query is appended internally, matching app.py).
    Yields: {"type": "chunk", "content": str} once per streamed token,
            or {"type": "image", "url": str, "alt": str} for known-person
            lookups before their canned answer.
    """
    person = _find_known_person(query)
    if person:
        yield {"type": "image", "url": _person_image_url(person), "alt": person["name"]}
        answer = _format_person_answer(person)
        for word in answer.split(" "):
            yield {"type": "chunk", "content": word + " "}
        return

    llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.7, streaming=True)

    lc_messages = history + [HumanMessage(content=query)]

    for chunk in llm.stream(lc_messages):
        if chunk.content:
            yield {"type": "chunk", "content": chunk.content}