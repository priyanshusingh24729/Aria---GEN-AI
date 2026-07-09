"""SQL Assistant service.

All eight SQL functions from app.py are ported with identical logic.
Two changes, per the decisions confirmed earlier:

1. explain_result() becomes stream_sql_explanation() — same generator
   pattern as the other two streaming services.
2. st.session_state (sql_db_path, sql_tables, sql_schema, sql_source_name)
   is replaced by _sql_sessions, an in-memory dict keyed by a UUID
   session_id issued on upload. This is lost on server restart — that's
   the agreed-upon "keep it simple" tradeoff; swap for Redis later by
   changing only the functions below this comment block.
"""
import datetime
import os
import re
import sqlite3
import tempfile
import uuid
from pathlib import Path
from typing import Generator, Optional

import pandas as pd
from langchain_core.prompts import ChatPromptTemplate
from langchain_mistralai import ChatMistralAI

from app.config.settings import get_settings

settings = get_settings()

_sql_sessions: dict[str, dict] = {}


def ensure_sql_temp_dir() -> str:
    """Create the sql_temp/ folder if it doesn't exist."""
    os.makedirs(settings.sql_temp_dir, exist_ok=True)
    return settings.sql_temp_dir


def get_schema_from_db(db_path: str) -> tuple[list[str], str]:
    """
    Connect to a SQLite database and return:
      - list of table names
      - schema string with EXACT stored column names + up to 3 sample values
        so the LLM uses the correct identifiers and understands real data casing.
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row[0] for row in cur.fetchall()]

    schema_parts = []
    for table in tables:
        cur.execute(f'PRAGMA table_info("{table}");')
        cols = cur.fetchall()  # (cid, name, type, notnull, dflt, pk)

        col_lines = []
        for col in cols:
            col_name = col[1]
            col_type = col[2]
            try:
                cur.execute(
                    f'SELECT DISTINCT "{col_name}" FROM "{table}" '
                    f'WHERE "{col_name}" IS NOT NULL LIMIT 3;'
                )
                samples = [str(r[0]) for r in cur.fetchall()]
                sample_str = ", ".join(f"'{s}'" for s in samples)
                col_lines.append(f"    {col_name} ({col_type})  -- e.g. {sample_str}")
            except Exception:
                col_lines.append(f"    {col_name} ({col_type})")

        cols_block = "\n".join(col_lines)
        schema_parts.append(
            f"Table: {table}\n"
            f"  Columns (use these EXACT names — do NOT add spaces or quotes):\n"
            f"{cols_block}"
        )

    conn.close()
    schema_str = "\n\n".join(schema_parts)
    return tables, schema_str


def load_sql_file_to_db(sql_file_bytes: bytes) -> str:
    """Execute a .sql script into a fresh temporary SQLite database. Returns the db path."""
    ensure_sql_temp_dir()
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    db_path = os.path.join(settings.sql_temp_dir, f"aria_sql_{ts}.db")

    script = sql_file_bytes.decode("utf-8", errors="replace")
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(script)
        conn.commit()
    finally:
        conn.close()

    return db_path


def sanitise_table_name(raw: str) -> str:
    """
    Convert any string into a valid SQLite identifier:
      1. Strip leading/trailing whitespace.
      2. Replace every run of non-alphanumeric characters with a single underscore.
      3. Collapse multiple consecutive underscores.
      4. Strip leading/trailing underscores.
      5. Prefix with 't_' if the result starts with a digit or is empty.
    """
    name = raw.strip()
    name = re.sub(r"[^A-Za-z0-9]+", "_", name)
    name = re.sub(r"_+", "_", name)
    name = name.strip("_")
    if not name or name[0].isdigit():
        name = "t_" + name
    return name


def load_excel_to_db(excel_bytes: bytes) -> str:
    """
    Read every sheet of an Excel file into a SQLite table.
    Sheet name → table name (sanitised). Returns the path to the new .db file.
    """
    ensure_sql_temp_dir()
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    db_path = os.path.join(settings.sql_temp_dir, f"aria_sql_{ts}.db")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        tmp.write(excel_bytes)
        tmp_path = tmp.name

    try:
        xls = pd.read_excel(tmp_path, sheet_name=None)
        conn = sqlite3.connect(db_path)
        for sheet_name, df in xls.items():
            table_name = sanitise_table_name(sheet_name)
            df.columns = [sanitise_table_name(str(c)) for c in df.columns]
            df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.close()
    finally:
        os.unlink(tmp_path)

    return db_path


def load_csv_to_db(csv_bytes: bytes, filename: str) -> str:
    """
    Read a CSV file into a SQLite table named after the file (without extension).
    Returns the path to the new .db file.
    """
    ensure_sql_temp_dir()
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    db_path = os.path.join(settings.sql_temp_dir, f"aria_sql_{ts}.db")

    table_name = sanitise_table_name(Path(filename).stem)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        tmp.write(csv_bytes)
        tmp_path = tmp.name

    try:
        df = pd.read_csv(tmp_path)
        df.columns = [sanitise_table_name(str(c)) for c in df.columns]
        conn = sqlite3.connect(db_path)
        df.to_sql(table_name, conn, if_exists="replace", index=False)
        conn.close()
    finally:
        os.unlink(tmp_path)

    return db_path


def load_db_file(db_bytes: bytes) -> str:
    """Copy the uploaded .db file into the temp directory and return its path."""
    ensure_sql_temp_dir()
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    db_path = os.path.join(settings.sql_temp_dir, f"aria_sql_{ts}.db")
    with open(db_path, "wb") as f:
        f.write(db_bytes)
    return db_path


SQL_GEN_SYSTEM_PROMPT = """You are an expert SQLite query writer.

You will be given a database schema and a question in plain English.
Your ONLY job is to write a single valid SQLite SQL query that answers the question.

Rules you MUST follow:
- Output ONLY the raw SQL statement. No explanation, no markdown, no code fences.
- Use ONLY the tables and columns listed in the schema. Never invent tables or columns.
- Column names in the schema use underscores (e.g. First_Name, Emp_ID). Use them EXACTLY as shown.
- NEVER wrap column names in double-quotes. Write: WHERE Designation = ... NOT WHERE "Designation" = ...
- String comparisons MUST always use COLLATE NOCASE to handle mixed case in real data.
  Example: WHERE Designation = 'HR Manager' COLLATE NOCASE
- Use proper SQLite syntax (e.g. LIMIT, not TOP).
- The sample values shown in the schema reveal the real data format and casing — use them as reference.
- If the question cannot be answered from the schema, output exactly:
  CANNOT_ANSWER: <brief reason>

Database schema:
{schema}"""


def generate_sql_query(question: str, schema: str) -> str:
    """
    Use ChatMistralAI + a LangChain prompt to convert a plain-English question
    into valid SQLite SQL, given the database schema.
    Returns the raw SQL string (or the CANNOT_ANSWER protocol string).
    """
    prompt = ChatPromptTemplate.from_messages([
        ("system", SQL_GEN_SYSTEM_PROMPT),
        ("human", "{question}"),
    ])

    llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.0)
    chain = prompt | llm
    result = chain.invoke({"schema": schema, "question": question})
    return result.content.strip()


def execute_sql_query(db_path: str, sql: str) -> tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Execute a SQL query against the SQLite database at db_path.
    Returns (DataFrame, None) on success or (None, error_message) on failure.
    """
    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_sql_query(sql, conn)
        conn.close()
        return df, None
    except Exception as e:
        return None, str(e)


def stream_sql_explanation(question: str, sql: str, df: pd.DataFrame) -> Generator[dict, None, None]:
    """
    Stream a short natural-language explanation of a query result.

    This is the direct replacement for explain_result()'s
    st.empty()/placeholder.markdown() loop.

    Yields: {"type": "chunk", "content": str} once per streamed token.
    """
    preview = df.head(20).to_string(index=False) if not df.empty else "(no rows returned)"
    row_count = len(df)

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are Aria, a helpful data analyst. "
            "Given a user question, the SQL query that was run, and the result, "
            "write a short 1–3 sentence plain-English explanation of what the result shows. "
            "Do not repeat the SQL. Be concise and friendly.",
        ),
        ("human", "Question: {question}\n\nSQL:\n{sql}\n\nResult ({rows} rows):\n{preview}"),
    ])

    llm = ChatMistralAI(model_name=settings.mistral_model, temperature=0.3, streaming=True)
    chain = prompt | llm

    for chunk in chain.stream({"question": question, "sql": sql, "preview": preview, "rows": row_count}):
        if chunk.content:
            yield {"type": "chunk", "content": chunk.content}


# ── In-memory session helpers (replaces st.session_state for SQL Assistant) ──

def create_session(db_path: str, tables: list[str], schema: str, source_name: str) -> str:
    """Register a new SQL session and return its session_id."""
    session_id = str(uuid.uuid4())
    _sql_sessions[session_id] = {
        "db_path": db_path,
        "tables": tables,
        "schema": schema,
        "source_name": source_name,
    }
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    """Fetch a session's metadata, or None if it doesn't exist."""
    return _sql_sessions.get(session_id)


def delete_session(session_id: str) -> bool:
    """Remove a session and delete its underlying db file. Returns True if it existed."""
    session = _sql_sessions.pop(session_id, None)
    if session is None:
        return False
    db_path = session.get("db_path")
    if db_path and os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass
    return True
