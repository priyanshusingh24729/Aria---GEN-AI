"""Document Assistant endpoints: upload, status, and delete.

Mirrors the upload/process/delete buttons from the Streamlit sidebar.
Global single-user state (no user-scoping yet), matching the original app.
"""
from fastapi import APIRouter, Depends, Form, UploadFile

from app.auth.supabase_jwt import get_current_user
from app.schemas.documents import DocumentStatusResponse, ProcessDocumentsResponse
from app.services.document_service import (
    create_vectorstore,
    force_delete_chroma,
    is_chroma_db_valid,
    load_documents,
)

router = APIRouter()

# Tracks the most recent successful indexing run. Global/single-session,
# matching the original Streamlit app's behaviour — no per-user scoping yet.
_doc_state = {"ready": False, "num_chunks": 0, "doc_names": []}


@router.post("/upload", response_model=ProcessDocumentsResponse)
async def upload_documents(
    files: list[UploadFile],
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200),
    user: dict = Depends(get_current_user),
):
    """Upload one or more documents (pdf/docx/txt/md/csv), chunk them, and embed into the vector store."""
    raw_files = [(f.filename, await f.read()) for f in files]
    docs, warnings = load_documents(raw_files)

    if not docs:
        message = "No content could be extracted from the uploaded files."
        if warnings:
            message += " " + " ".join(warnings)
        return ProcessDocumentsResponse(success=False, error=message)

    try:
        _, n_chunks = create_vectorstore(docs, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    except Exception as e:
        return ProcessDocumentsResponse(success=False, error=f"Embedding error: {e}")

    doc_names = [f.filename for f in files]
    _doc_state.update({"ready": True, "num_chunks": n_chunks, "doc_names": doc_names})

    return ProcessDocumentsResponse(success=True, num_chunks=n_chunks, doc_names=doc_names)


@router.get("/status", response_model=DocumentStatusResponse)
async def document_status(user: dict = Depends(get_current_user)):
    """Report whether the vector store is ready, and how many chunks/docs it holds."""
    ready = _doc_state["ready"] or is_chroma_db_valid()
    return DocumentStatusResponse(
        ready=ready,
        num_chunks=_doc_state["num_chunks"],
        doc_names=_doc_state["doc_names"],
    )


@router.delete("/")
async def delete_documents(user: dict = Depends(get_current_user)):
    """Delete the persisted vector store entirely (mirrors the sidebar's 'Delete Vector Database' button)."""
    deleted = force_delete_chroma()
    _doc_state.update({"ready": False, "num_chunks": 0, "doc_names": []})
    return {"deleted": deleted}
