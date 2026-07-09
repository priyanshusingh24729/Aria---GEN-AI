# """Document Assistant (RAG) service.

# Every function here is ported from app.py with identical logic. The only
# behavioural change is in stream_rag_answer(), where the old
# ``st.empty()`` + ``response_placeholder.markdown(full_response + "▌")``
# loop becomes a generator that yields chunks for the API layer to forward
# over SSE.
# """
# import gc
# import os
# import shutil
# import sqlite3
# import tempfile
# from pathlib import Path
# from typing import Generator

# from langchain_community.document_loaders import (
#     CSVLoader,
#     Docx2txtLoader,
#     PyPDFLoader,
#     TextLoader,
#     UnstructuredMarkdownLoader,
# )
# from langchain_community.vectorstores import Chroma
# from langchain_core.messages import HumanMessage
# from langchain_core.prompts import ChatPromptTemplate
# from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
# from langchain_text_splitters import RecursiveCharacterTextSplitter

# from app.config.settings import get_settings

# settings = get_settings()


# def load_documents(files: list[tuple[str, bytes]]) -> tuple[list, list[str]]:
#     """
#     Load and parse uploaded documents (multi-format: pdf, docx, txt, md, csv).

#     files: list of (filename, raw_bytes) tuples — the FastAPI equivalent of
#            Streamlit's list of UploadedFile objects.
#     Returns: (list of LangChain Document objects, list of warning/error strings)
#     """
#     all_docs = []
#     warnings: list[str] = []
#     tmp_paths = []

#     for filename, raw_bytes in files:
#         suffix = Path(filename).suffix.lower()
#         with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
#             tmp.write(raw_bytes)
#             tmp_path = tmp.name
#             tmp_paths.append(tmp_path)

#         try:
#             if suffix == ".pdf":
#                 loader = PyPDFLoader(tmp_path)
#             elif suffix == ".docx":
#                 loader = Docx2txtLoader(tmp_path)
#             elif suffix == ".txt":
#                 loader = TextLoader(tmp_path, encoding="utf-8")
#             elif suffix == ".md":
#                 loader = UnstructuredMarkdownLoader(tmp_path)
#             elif suffix == ".csv":
#                 loader = CSVLoader(tmp_path, encoding="utf-8")
#             else:
#                 warnings.append(f"Unsupported file type: {filename} — skipped.")
#                 continue

#             docs = loader.load()
#             for doc in docs:
#                 doc.metadata["source_file"] = filename
#             all_docs.extend(docs)
#         except Exception as e:
#             warnings.append(f"Failed to load {filename}: {e}")

#     for p in tmp_paths:
#         try:
#             os.unlink(p)
#         except OSError:
#             pass

#     return all_docs, warnings


# def force_delete_chroma() -> bool:
#     """Forcibly remove the persisted Chroma directory, handling locked sqlite files."""
#     chroma_dir = settings.chroma_dir
#     if not os.path.exists(chroma_dir):
#         return True

#     sqlite_path = os.path.join(chroma_dir, "chroma.sqlite3")
#     if os.path.exists(sqlite_path):
#         try:
#             conn = sqlite3.connect(sqlite_path)
#             conn.close()
#         except Exception:
#             pass

#     gc.collect()

#     try:
#         shutil.rmtree(chroma_dir)
#         return True
#     except OSError:
#         try:
#             for root, dirs, files in os.walk(chroma_dir, topdown=False):
#                 for f in files:
#                     try:
#                         os.remove(os.path.join(root, f))
#                     except OSError:
#                         pass
#                 for d in dirs:
#                     try:
#                         os.rmdir(os.path.join(root, d))
#                     except OSError:
#                         pass
#             os.rmdir(chroma_dir)
#             return True
#         except OSError:
#             return False


# def is_chroma_db_valid() -> bool:
#     """Check that the persisted Chroma sqlite file has the expected internal tables."""
#     sqlite_path = os.path.join(settings.chroma_dir, "chroma.sqlite3")
#     if not os.path.exists(sqlite_path):
#         return False
#     try:
#         conn = sqlite3.connect(sqlite_path)
#         cur = conn.cursor()
#         cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
#         tables = {row[0] for row in cur.fetchall()}
#         conn.close()
#         required = {"tenants", "databases", "collections", "embeddings"}
#         return required.issubset(tables)
#     except Exception:
#         return False


# def create_vectorstore(docs: list, chunk_size: int = 1000, chunk_overlap: int = 200) -> tuple[Chroma, int]:
#     """Chunk documents and embed them into a fresh persisted Chroma store."""
#     splitter = RecursiveCharacterTextSplitter(
#         chunk_size=chunk_size,
#         chunk_overlap=chunk_overlap,
#         separators=["\n\n", "\n", ". ", " ", ""],
#     )
#     chunks = splitter.split_documents(docs)

#     embeddings = MistralAIEmbeddings(model=settings.embed_model)

#     if os.path.exists(settings.chroma_dir):
#         force_delete_chroma()

#     vectorstore = Chroma.from_documents(
#         documents=chunks,
#         embedding=embeddings,
#         persist_directory=settings.chroma_dir,
#     )
#     vectorstore.persist()
#     return vectorstore, len(chunks)


# def get_retriever(k: int = 4, fetch_k: int = 12, lambda_mult: float = 0.5):
#     """Return an MMR retriever backed by the persisted Chroma store, or None if unavailable."""
#     if not os.path.exists(settings.chroma_dir) or not is_chroma_db_valid():
#         return None

#     embeddings = MistralAIEmbeddings(model=settings.embed_model)
#     vectorstore = Chroma(
#         persist_directory=settings.chroma_dir,
#         embedding_function=embeddings,
#     )
#     return vectorstore.as_retriever(
#         search_type="mmr",
#         search_kwargs={"k": k, "fetch_k": fetch_k, "lambda_mult": lambda_mult},
#     )


# RAG_SYSTEM_PROMPT = """You are Aria, an expert AI document assistant.

# Use ONLY the provided document context.

# When answering:
# 1. Give detailed explanations.
# 2. Explain concepts step-by-step.
# 3. Include important details from the document.
# 4. Provide examples when available.
# 5. Summarize key takeaways at the end.
# 6. Use markdown headings and bullet points.
# 7. Cite document names whenever relevant.

# If the answer is not present in the context, say:
# 'I couldn't find that in the uploaded documents.'

# Your responses should be comprehensive and educational rather than brief."""


# def stream_rag_answer(query: str, retriever, history: list) -> Generator[dict, None, None]:
#     """
#     Stream a RAG answer chunk-by-chunk.

#     This is the direct replacement for answer_question_rag()'s
#     st.empty()/response_placeholder.markdown() loop.

#     Yields:
#         {"type": "chunk", "content": str}            — once per streamed token
#         {"type": "sources", "sources": [...]}         — once, after the text stream ends
#     """
#     docs = retriever.invoke(query)
#     context = "\n\n---\n\n".join(doc.page_content for doc in docs)

#     history_text = ""
#     for msg in history[-6:]:
#         role = "User" if isinstance(msg, HumanMessage) else "Assistant"
#         history_text += f"{role}: {msg.content}\n"

#     prompt = ChatPromptTemplate.from_messages(
#         [
#             ("system", RAG_SYSTEM_PROMPT),
#             (
#                 "human",
#                 "Conversation history:\n{history}\n\nDocument context:\n{context}\n\nQuestion: {question}",
#             ),
#         ]
#     )

#     llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.3, streaming=True)
#     chain = prompt | llm

#     for chunk in chain.stream({"context": context, "question": query, "history": history_text}):
#         if chunk.content:
#             yield {"type": "chunk", "content": chunk.content}

#     serialised_sources = [
#         {
#             "content": doc.page_content[:600] + ("…" if len(doc.page_content) > 600 else ""),
#             "source_file": doc.metadata.get("source_file", "unknown"),
#             "page": doc.metadata.get("page"),
#         }
#         for doc in docs
#     ]
#     yield {"type": "sources", "sources": serialised_sources}
"""Document Assistant (RAG) service.

Every function here is ported from app.py with identical logic. The only
behavioural change is in stream_rag_answer(), where the old
``st.empty()`` + ``response_placeholder.markdown(full_response + "▌")``
loop becomes a generator that yields chunks for the API layer to forward
over SSE.

Performance note: embeddings client and the Chroma vectorstore are now
cached at module level (``_embeddings`` / ``_vectorstore``) instead of
being re-constructed on every call to get_retriever()/create_vectorstore().
This avoids re-initializing the Mistral embeddings client and reloading
the persisted Chroma index from disk on every single question.
"""
import gc
import os
import shutil
import sqlite3
import tempfile
from pathlib import Path
from typing import Generator

from langchain_community.document_loaders import (
    CSVLoader,
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain_community.vectorstores import Chroma
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config.settings import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Module-level caches. These persist for the lifetime of the worker process
# so we don't pay embeddings-client-init / Chroma-disk-load cost per request.
# ---------------------------------------------------------------------------
_embeddings = None
_vectorstore = None


def _get_embeddings() -> MistralAIEmbeddings:
    """Return a cached MistralAIEmbeddings client, creating it once."""
    global _embeddings
    if _embeddings is None:
        _embeddings = MistralAIEmbeddings(model=settings.embed_model)
    return _embeddings


def _invalidate_vectorstore_cache() -> None:
    """Drop the cached vectorstore reference (call after deleting the Chroma dir)."""
    global _vectorstore
    _vectorstore = None


def load_documents(files: list[tuple[str, bytes]]) -> tuple[list, list[str]]:
    """
    Load and parse uploaded documents (multi-format: pdf, docx, txt, md, csv).

    files: list of (filename, raw_bytes) tuples — the FastAPI equivalent of
           Streamlit's list of UploadedFile objects.
    Returns: (list of LangChain Document objects, list of warning/error strings)
    """
    all_docs = []
    warnings: list[str] = []
    tmp_paths = []

    for filename, raw_bytes in files:
        suffix = Path(filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(raw_bytes)
            tmp_path = tmp.name
            tmp_paths.append(tmp_path)

        try:
            if suffix == ".pdf":
                loader = PyPDFLoader(tmp_path)
            elif suffix == ".docx":
                loader = Docx2txtLoader(tmp_path)
            elif suffix == ".txt":
                loader = TextLoader(tmp_path, encoding="utf-8")
            elif suffix == ".md":
                loader = UnstructuredMarkdownLoader(tmp_path)
            elif suffix == ".csv":
                loader = CSVLoader(tmp_path, encoding="utf-8")
            else:
                warnings.append(f"Unsupported file type: {filename} — skipped.")
                continue

            docs = loader.load()
            for doc in docs:
                doc.metadata["source_file"] = filename
            all_docs.extend(docs)
        except Exception as e:
            warnings.append(f"Failed to load {filename}: {e}")

    for p in tmp_paths:
        try:
            os.unlink(p)
        except OSError:
            pass

    return all_docs, warnings


def force_delete_chroma() -> bool:
    """Forcibly remove the persisted Chroma directory, handling locked sqlite files."""
    chroma_dir = settings.chroma_dir
    if not os.path.exists(chroma_dir):
        return True

    sqlite_path = os.path.join(chroma_dir, "chroma.sqlite3")
    if os.path.exists(sqlite_path):
        try:
            conn = sqlite3.connect(sqlite_path)
            conn.close()
        except Exception:
            pass

    gc.collect()

    try:
        shutil.rmtree(chroma_dir)
        _invalidate_vectorstore_cache()
        return True
    except OSError:
        try:
            for root, dirs, files in os.walk(chroma_dir, topdown=False):
                for f in files:
                    try:
                        os.remove(os.path.join(root, f))
                    except OSError:
                        pass
                for d in dirs:
                    try:
                        os.rmdir(os.path.join(root, d))
                    except OSError:
                        pass
            os.rmdir(chroma_dir)
            _invalidate_vectorstore_cache()
            return True
        except OSError:
            return False


def is_chroma_db_valid() -> bool:
    """Check that the persisted Chroma sqlite file has the expected internal tables."""
    sqlite_path = os.path.join(settings.chroma_dir, "chroma.sqlite3")
    if not os.path.exists(sqlite_path):
        return False
    try:
        conn = sqlite3.connect(sqlite_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cur.fetchall()}
        conn.close()
        required = {"tenants", "databases", "collections", "embeddings"}
        return required.issubset(tables)
    except Exception:
        return False


def create_vectorstore(docs: list, chunk_size: int = 1000, chunk_overlap: int = 200) -> tuple[Chroma, int]:
    """Chunk documents and embed them into a fresh persisted Chroma store."""
    global _vectorstore

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(docs)

    embeddings = _get_embeddings()

    if os.path.exists(settings.chroma_dir):
        force_delete_chroma()

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=settings.chroma_dir,
    )
    vectorstore.persist()

    # Cache it so get_retriever() reuses this instance instead of reloading
    # the index from disk on the very next call.
    _vectorstore = vectorstore

    return vectorstore, len(chunks)


def get_retriever(k: int = 4, fetch_k: int = 12, lambda_mult: float = 0.5):
    """Return an MMR retriever backed by the persisted Chroma store, or None if unavailable."""
    global _vectorstore

    if not os.path.exists(settings.chroma_dir) or not is_chroma_db_valid():
        return None

    if _vectorstore is None:
        _vectorstore = Chroma(
            persist_directory=settings.chroma_dir,
            embedding_function=_get_embeddings(),
        )

    return _vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={"k": k, "fetch_k": fetch_k, "lambda_mult": lambda_mult},
    )


RAG_SYSTEM_PROMPT = """You are Aria, an expert AI document assistant.

Use ONLY the provided document context.

When answering:
1. Give detailed explanations.
2. Explain concepts step-by-step.
3. Include important details from the document.
4. Provide examples when available.
5. Summarize key takeaways at the end.
6. Use markdown headings and bullet points.
7. Cite document names whenever relevant.

If the answer is not present in the context, say:
'I couldn't find that in the uploaded documents.'

Your responses should be comprehensive and educational rather than brief."""


def stream_rag_answer(query: str, retriever, history: list) -> Generator[dict, None, None]:
    """
    Stream a RAG answer chunk-by-chunk.

    This is the direct replacement for answer_question_rag()'s
    st.empty()/response_placeholder.markdown() loop.

    Yields:
        {"type": "chunk", "content": str}            — once per streamed token
        {"type": "sources", "sources": [...]}         — once, after the text stream ends
    """
    docs = retriever.invoke(query)
    context = "\n\n---\n\n".join(doc.page_content for doc in docs)

    history_text = ""
    for msg in history[-6:]:
        role = "User" if isinstance(msg, HumanMessage) else "Assistant"
        history_text += f"{role}: {msg.content}\n"

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", RAG_SYSTEM_PROMPT),
            (
                "human",
                "Conversation history:\n{history}\n\nDocument context:\n{context}\n\nQuestion: {question}",
            ),
        ]
    )

    llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.3, streaming=True)
    chain = prompt | llm

    for chunk in chain.stream({"context": context, "question": query, "history": history_text}):
        if chunk.content:
            yield {"type": "chunk", "content": chunk.content}

    serialised_sources = [
        {
            "content": doc.page_content[:600] + ("…" if len(doc.page_content) > 600 else ""),
            "source_file": doc.metadata.get("source_file", "unknown"),
            "page": doc.metadata.get("page"),
        }
        for doc in docs
    ]
    yield {"type": "sources", "sources": serialised_sources}