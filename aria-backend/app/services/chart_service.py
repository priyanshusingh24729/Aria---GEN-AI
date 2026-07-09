"""
Chart recommendation service.

Given a Pandas DataFrame returned from SQL execution,
decide the most appropriate chart and return a ChartConfig.

This service DOES NOT generate charts.
It only returns metadata for the frontend.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
from pandas.api.types import (
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

from app.schemas.chart import ChartConfig


def _find_numeric_columns(df: pd.DataFrame) -> list[str]:
    """Return numeric columns."""
    return [
        column
        for column in df.columns
        if is_numeric_dtype(df[column])
    ]


def _find_datetime_columns(df: pd.DataFrame) -> list[str]:
    """Return datetime columns."""
    return [
        column
        for column in df.columns
        if is_datetime64_any_dtype(df[column])
    ]


def _find_categorical_columns(df: pd.DataFrame) -> list[str]:
    """Return categorical columns."""
    return [
        column
        for column in df.columns
        if not is_numeric_dtype(df[column])
    ]


def generate_chart_config(
    question: str,
    df: pd.DataFrame,
) -> ChartConfig | None:
    """
    Decide the most appropriate chart for a SQL query result.

    Returns:
        ChartConfig if a suitable chart exists.
        None otherwise.
    """

    if df.empty:
        return None

    if len(df.columns) < 2:
        return None

    numeric_cols = _find_numeric_columns(df)
    datetime_cols = _find_datetime_columns(df)
    categorical_cols = _find_categorical_columns(df)

    # Convert keys to strings for JSON/Pydantic compatibility
    data: list[dict[str, Any]] = [
        {str(k): v for k, v in row.items()}
        for row in df.to_dict(orient="records")
    ]

    # ---------------------------------------------------
    # LINE CHART
    # Date + Numeric
    # ---------------------------------------------------

    if datetime_cols and numeric_cols:
        return ChartConfig(
            type="line",
            title=question,
            xKey=datetime_cols[0],
            yKey=numeric_cols[0],
            data=data,
        )

    # ---------------------------------------------------
    # BAR / PIE
    # Category + Numeric
    # ---------------------------------------------------

    if categorical_cols and numeric_cols:

        # Few categories → Pie Chart
        if len(df) <= 6:
            return ChartConfig(
                type="pie",
                title=question,
                nameKey=categorical_cols[0],
                valueKey=numeric_cols[0],
                data=data,
            )

        # Many categories → Bar Chart
        return ChartConfig(
            type="bar",
            title=question,
            xKey=categorical_cols[0],
            yKey=numeric_cols[0],
            data=data,
        )

    # ---------------------------------------------------
    # SCATTER CHART
    # Two numeric columns
    # ---------------------------------------------------

    if len(numeric_cols) >= 2:
        return ChartConfig(
            type="scatter",
            title=question,
            xKey=numeric_cols[0],
            yKey=numeric_cols[1],
            data=data,
        )

    # ---------------------------------------------------
    # No suitable visualization
    # ---------------------------------------------------

    return None