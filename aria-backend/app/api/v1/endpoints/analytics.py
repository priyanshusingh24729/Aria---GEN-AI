"""
API layer for the AI-powered Analytics Dashboard module.

Responsibilities here are limited to request validation, delegating to
`AnalyticsService`, and shaping HTTP responses/errors — same convention as
`api/v1/endpoints/datacleaning.py`. No analysis logic lives in this file.

This module does not touch the SQL Assistant's execution path. It only
accepts a DataFrame already produced elsewhere (serialized as JSON records)
and analyzes it.
"""
from __future__ import annotations

import logging

import pandas as pd
from fastapi import APIRouter, HTTPException, status

from app.schemas.analytics import AnalyticsDashboardResponse, AnalyticsRequest
from app.services.analytics_service import (
    AnalyticsError,
    EmptyDataFrameError,
    analytics_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _handle_service_errors(exc: AnalyticsError) -> None:
    """Translate domain exceptions into the appropriate HTTP error."""
    if isinstance(exc, EmptyDataFrameError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    logger.exception("Unhandled analytics error")
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post(
    "/analyze",
    response_model=AnalyticsDashboardResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze a DataFrame (as JSON records) and return a full analytics dashboard",
)
async def analyze(request: AnalyticsRequest) -> AnalyticsDashboardResponse:
    """
    Accepts a DataFrame serialized as JSON records (e.g. the output of a
    SQL Assistant query via `df.to_dict('records')`) and returns dataset
    summary, statistics, KPIs, trends, correlation, outliers, data quality
    score, rule-based insights, and chart recommendations.
    """
    try:
        df = pd.DataFrame.from_records(request.records)
    except Exception as exc:  # malformed records payload
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse records into a DataFrame: {exc}",
        ) from exc

    try:
        return analytics_service.analyze_dataframe(df, dataset_name=request.dataset_name)
    except AnalyticsError as exc:
        _handle_service_errors(exc)