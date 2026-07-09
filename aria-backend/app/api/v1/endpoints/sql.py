# """SQL Assistant endpoints.

# Mirrors the sidebar upload flow and the NL→SQL→results→explanation chat
# flow from app.py's SQL Assistant mode. Sessions live in the in-memory
# dict in sql_service.py, keyed by a UUID session_id returned from /upload.
# """
# from pathlib import Path

# from fastapi import APIRouter, Depends, HTTPException, UploadFile
# from fastapi.responses import StreamingResponse

# from app.auth.supabase_jwt import get_current_user
# from app.schemas.sql import SqlQueryRequest, SqlSchemaResponse, SqlUploadResponse
# from app.services.sql_service import (
#     create_session,
#     delete_session,
#     execute_sql_query,
#     generate_sql_query,
#     get_schema_from_db,
#     get_session,
#     load_csv_to_db,
#     load_db_file,
#     load_excel_to_db,
#     load_sql_file_to_db,
#     stream_sql_explanation,
# )
# from app.utils.streaming import sse_done, sse_error, sse_event

# router = APIRouter()


# @router.post("/upload", response_model=SqlUploadResponse)
# async def upload_sql_source(file: UploadFile, user: dict = Depends(get_current_user)):
#     """Upload a .db, .sql, .xlsx, or .csv file and create a new SQL session."""
#     suffix = Path(file.filename).suffix.lower()
#     raw = await file.read()

#     try:
#         if suffix == ".db":
#             db_path = load_db_file(raw)
#         elif suffix == ".sql":
#             db_path = load_sql_file_to_db(raw)
#         elif suffix == ".xlsx":
#             db_path = load_excel_to_db(raw)
#         elif suffix == ".csv":
#             db_path = load_csv_to_db(raw, file.filename)
#         else:
#             raise HTTPException(status_code=400, detail="Unsupported file type.")

#         tables, schema = get_schema_from_db(db_path)
#         session_id = create_session(db_path, tables, schema, file.filename)

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Failed to load file: {e}")

#     return SqlUploadResponse(session_id=session_id, tables=tables, schema_text=schema, source_name=file.filename)


# @router.get("/schema", response_model=SqlSchemaResponse)
# async def get_sql_schema(session_id: str, user: dict = Depends(get_current_user)):
#     """Retrieve the schema for an active SQL session."""
#     session = get_session(session_id)
#     if session is None:
#         raise HTTPException(status_code=404, detail="Session not found.")
#     return SqlSchemaResponse(
#         session_id=session_id,
#         tables=session["tables"],
#         schema_text=session["schema"],
#         source_name=session["source_name"],
#     )


# @router.post("/query")
# async def sql_query(payload: SqlQueryRequest, user: dict = Depends(get_current_user)):
#     """
#     Convert a natural-language question to SQL, execute it, and stream back a
#     natural-language explanation of the result.

#     Event sequence:
#       event: cannot_answer  data: {"reason": "..."}                      (terminal, if the LLM declines)
#       event: sql            data: {"sql": "..."}                          (once, if SQL was generated)
#       event: error          data: {"error": "..."}                       (terminal, on execution failure)
#       event: results        data: {"rows": [...], "row_count": N}        (once, on execution success)
#       event: chunk          data: {"content": "..."}                     (repeated — explanation tokens)
#       event: done            data: {"done": true}                         (terminal, success)
#     """
#     session = get_session(payload.session_id)
#     if session is None:
#         raise HTTPException(status_code=404, detail="Session not found.")

#     def event_stream():
#         try:
#             raw_sql = generate_sql_query(payload.question, session["schema"])

#             if raw_sql.startswith("CANNOT_ANSWER:"):
#                 reason = raw_sql.replace("CANNOT_ANSWER:", "").strip()
#                 yield sse_event("cannot_answer", {"reason": reason})
#                 return

#             yield sse_event("sql", {"sql": raw_sql})

#             df, err = execute_sql_query(session["db_path"], raw_sql)
#             if err:
#                 yield sse_error(err)
#                 return

#             yield sse_event("results", {"rows": df.to_dict(orient="records"), "row_count": len(df)})

#             for event in stream_sql_explanation(payload.question, raw_sql, df):
#                 yield sse_event("chunk", {"content": event["content"]})

#             yield sse_done()
#         except Exception as e:
#             yield sse_error(str(e))

#     return StreamingResponse(event_stream(), media_type="text/event-stream")


# @router.delete("/session")
# async def delete_sql_session(session_id: str, user: dict = Depends(get_current_user)):
#     """Clean up a SQL session and delete its temp database file."""
#     deleted = delete_session(session_id)
#     if not deleted:
#         raise HTTPException(status_code=404, detail="Session not found.")
#     return {"deleted": True}


"""SQL Assistant endpoints.

Mirrors the sidebar upload flow and the NL→SQL→results→explanation chat
flow from app.py's SQL Assistant mode. Sessions live in the in-memory
dict in sql_service.py, keyed by a UUID session_id returned from /upload.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.auth.supabase_jwt import get_current_user
from app.schemas.sql import SqlQueryRequest, SqlSchemaResponse, SqlUploadResponse
from app.services.chart_service import generate_chart_config
from app.services.sql_service import (
    create_session,
    delete_session,
    execute_sql_query,
    generate_sql_query,
    get_schema_from_db,
    get_session,
    load_csv_to_db,
    load_db_file,
    load_excel_to_db,
    load_sql_file_to_db,
    stream_sql_explanation,
)
from app.utils.streaming import sse_done, sse_error, sse_event

router = APIRouter()


@router.post("/upload", response_model=SqlUploadResponse)
async def upload_sql_source(file: UploadFile, user: dict = Depends(get_current_user)):
    """Upload a .db, .sql, .xlsx, or .csv file and create a new SQL session."""
    suffix = Path(file.filename).suffix.lower()
    raw = await file.read()

    try:
        if suffix == ".db":
            db_path = load_db_file(raw)
        elif suffix == ".sql":
            db_path = load_sql_file_to_db(raw)
        elif suffix == ".xlsx":
            db_path = load_excel_to_db(raw)
        elif suffix == ".csv":
            db_path = load_csv_to_db(raw, file.filename)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")

        tables, schema = get_schema_from_db(db_path)
        session_id = create_session(db_path, tables, schema, file.filename)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load file: {e}")

    return SqlUploadResponse(
        session_id=session_id,
        tables=tables,
        schema_text=schema,
        source_name=file.filename,
    )


@router.get("/schema", response_model=SqlSchemaResponse)
async def get_sql_schema(session_id: str, user: dict = Depends(get_current_user)):
    """Retrieve the schema for an active SQL session."""
    session = get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return SqlSchemaResponse(
        session_id=session_id,
        tables=session["tables"],
        schema_text=session["schema"],
        source_name=session["source_name"],
    )


@router.post("/query")
async def sql_query(payload: SqlQueryRequest, user: dict = Depends(get_current_user)):
    """
    Convert a natural-language question to SQL, execute it, and stream back a
    natural-language explanation of the result.

    Event sequence:
      event: cannot_answer  data: {"reason": "..."}                      (terminal, if the LLM declines)
      event: sql            data: {"sql": "..."}                          (once, if SQL was generated)
      event: error          data: {"error": "..."}                        (terminal, on execution failure)
      event: results        data: {"rows": [...], "row_count": N}         (once, on execution success)
      event: chart          data: { ... chart configuration ... }
      event: chunk          data: {"content": "..."}                      (repeated — explanation tokens)
      event: done           data: {"done": true}                          (terminal, success)
    """
    session = get_session(payload.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    def event_stream():
        try:
            raw_sql = generate_sql_query(payload.question, session["schema"])

            if raw_sql.startswith("CANNOT_ANSWER:"):
                reason = raw_sql.replace("CANNOT_ANSWER:", "").strip()
                yield sse_event("cannot_answer", {"reason": reason})
                return

            yield sse_event("sql", {"sql": raw_sql})

            df, err = execute_sql_query(
                session["db_path"],
                raw_sql,
            )

            if err:
                yield sse_error(err)
                return

            yield sse_event(
                "results",
                {
                    "rows": df.to_dict(orient="records"),
                    "row_count": len(df),
                },
            )

            chart = generate_chart_config(
                payload.question,
                df,
            )

            if chart is not None:
                yield sse_event(
                    "chart",
                    chart.model_dump(),
                )

            for event in stream_sql_explanation(
                payload.question,
                raw_sql,
                df,
            ):
                yield sse_event(
                    "chunk",
                    {
                        "content": event["content"],
                    },
                )

            yield sse_done()

        except Exception as e:
            yield sse_error(str(e))

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.delete("/session")
async def delete_sql_session(session_id: str, user: dict = Depends(get_current_user)):
    """Clean up a SQL session and delete its temp database file."""
    deleted = delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"deleted": True}