"""
API layer for the AI-powered Data Cleaning module.

Responsibilities here are limited to request validation, delegating to
`DataCleaningService`, and shaping HTTP responses/errors. No business logic
lives in this file.
"""
from __future__ import annotations

import logging
import time

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.schemas.datacleaning import (
    CleaningReport,
    CleaningRequest,
    CleaningResponse,
    FeatureEngineeringRequest,
    FeatureEngineeringResponse,
    FeatureEngineeringSuggestionsResponse,
    FeatureExtractionRequest,
    FeatureExtractionResponse,
    PreviewResponse,
    UploadAnalysisResponse,
)
from app.services.datacleaning_service import (
    ColumnNotFoundError,
    DataCleaningError,
    InvalidOperationError,
    SessionNotFoundError,
    UnsupportedFileTypeError,
    data_cleaning_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/datacleaning", tags=["Data Cleaning"])

_MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


def _handle_service_errors(exc: DataCleaningError) -> None:
    """Translate domain exceptions into the appropriate HTTP error."""
    if isinstance(exc, SessionNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if isinstance(exc, (UnsupportedFileTypeError, ColumnNotFoundError, InvalidOperationError)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    logger.exception("Unhandled data cleaning error")
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post(
    "/upload",
    response_model=UploadAnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a dataset and receive a full read-only analysis report",
)
async def upload_dataset(file: UploadFile = File(...)) -> UploadAnalysisResponse:
    """
    Uploads a CSV/XLSX/XLS/JSON file, loads it with Pandas, and returns an
    analysis report plus recommended cleaning operations. No data is
    modified at this stage.
    """
    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {_MAX_UPLOAD_BYTES // (1024 * 1024)}MB upload limit.",
        )
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        session_id, filename, analysis, recommendations = data_cleaning_service.ingest_and_analyze(
            filename=file.filename or "uploaded_file", content=content
        )
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return UploadAnalysisResponse(
        session_id=session_id, filename=filename,
        analysis=analysis, recommended_operations=recommendations,
    )


@router.get(
    "/{session_id}/preview",
    response_model=PreviewResponse,
    summary="Preview the current state of the dataset for a session",
)
async def preview_dataset(session_id: str, rows: int = Query(default=20, ge=1, le=500)) -> PreviewResponse:
    try:
        columns, records, total_rows = data_cleaning_service.preview(session_id, rows=rows)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return PreviewResponse(session_id=session_id, columns=columns, rows=records, total_rows=total_rows)


@router.get(
    "/{session_id}/analysis",
    response_model=UploadAnalysisResponse,
    summary="Re-run analysis on the current (possibly partially cleaned) dataset",
)
async def get_analysis(session_id: str) -> UploadAnalysisResponse:
    try:
        report = data_cleaning_service.reanalyze(session_id)
        recommendations = data_cleaning_service._analyzer.recommend(report)  # read-only helper reuse
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return UploadAnalysisResponse(
        session_id=session_id, filename="", analysis=report, recommended_operations=recommendations
    )


@router.post(
    "/{session_id}/clean",
    response_model=CleaningResponse,
    summary="Apply user-selected cleaning operations",
)
async def clean_dataset(session_id: str, request: CleaningRequest) -> CleaningResponse:
    """
    Applies only the operations explicitly selected by the user (see
    `recommended_operations` from the upload/analysis response). Returns the
    per-operation result plus a fresh analysis of the cleaned dataset.
    """
    try:
        results, analysis = data_cleaning_service.apply_cleaning(session_id, request.operations)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return CleaningResponse(session_id=session_id, results=results, analysis=analysis)


@router.get(
    "/{session_id}/feature-engineering/suggestions",
    response_model=FeatureEngineeringSuggestionsResponse,
    summary="Get suggested feature engineering opportunities",
)
async def suggest_feature_engineering(session_id: str) -> FeatureEngineeringSuggestionsResponse:
    try:
        suggestions = data_cleaning_service.suggest_feature_engineering(session_id)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return FeatureEngineeringSuggestionsResponse(session_id=session_id, suggestions=suggestions)


@router.post(
    "/{session_id}/feature-engineering",
    response_model=FeatureEngineeringResponse,
    summary="Apply user-selected feature engineering operations",
)
async def apply_feature_engineering(session_id: str, request: FeatureEngineeringRequest) -> FeatureEngineeringResponse:
    try:
        results, columns = data_cleaning_service.apply_feature_engineering(session_id, request.operations)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return FeatureEngineeringResponse(session_id=session_id, results=results, columns=columns)


@router.post(
    "/{session_id}/feature-extraction",
    response_model=FeatureExtractionResponse,
    summary="Run feature extraction / selection and return importance scores",
)
async def apply_feature_extraction(session_id: str, request: FeatureExtractionRequest) -> FeatureExtractionResponse:
    try:
        selected, importances = data_cleaning_service.apply_feature_extraction(
            session_id, request.method, request.target_column,
            request.n_features, request.variance_threshold,
        )
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return FeatureExtractionResponse(
        session_id=session_id, method=request.method,
        selected_features=selected, feature_importances=importances,
    )


@router.post(
    "/{session_id}/feature-extraction/apply",
    response_model=PreviewResponse,
    summary="Reduce the dataset to a chosen set of features (post feature-extraction)",
)
async def apply_feature_selection(session_id: str, keep_columns: list[str]) -> PreviewResponse:
    try:
        data_cleaning_service.apply_feature_selection(session_id, keep_columns)
        columns, records, total_rows = data_cleaning_service.preview(session_id)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return PreviewResponse(session_id=session_id, columns=columns, rows=records, total_rows=total_rows)


@router.post(
    "/{session_id}/finalize",
    response_model=CleaningReport,
    summary="Finalize the workflow: export the cleaned dataset and return the full report",
)
async def finalize_dataset(session_id: str, file_format: str = Query(default="csv", pattern="^(csv|xlsx|json)$")) -> CleaningReport:
    start_time = time.time()
    try:
        report = data_cleaning_service.finalize(session_id, start_time, file_format=file_format)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    return report


@router.get(
    "/{session_id}/download",
    summary="Download the finalized, cleaned dataset",
)
async def download_dataset(session_id: str, format: str = Query(default="csv", pattern="^(csv|xlsx|json)$")):
    try:
        path = data_cleaning_service.get_output_path(session_id, file_format=format)
    except DataCleaningError as exc:
        _handle_service_errors(exc)
    media_types = {
        "csv": "text/csv",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "json": "application/json",
    }
    return FileResponse(
        path=str(path),
        media_type=media_types[format],
        filename=f"cleaned_dataset_{session_id}.{format}",
    )


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Delete a session and any exported files associated with it",
)
async def delete_session(session_id: str) -> None:
    data_cleaning_service.delete_session(session_id)