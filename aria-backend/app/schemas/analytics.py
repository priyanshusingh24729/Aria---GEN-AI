"""
Pydantic v2 response/request models for the Analytics Dashboard module.

Mirrors the schema style used in `schemas/datacleaning.py` — flat, typed,
documented models with sane defaults so partial results (e.g. no datetime
column present) serialize cleanly instead of raising.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class AnalyticsRequest(BaseModel):
    """
    Request payload for `/analytics/analyze`.

    `records` is the DataFrame serialized the standard pandas way:
    `df.to_dict(orient="records")` on the caller's side (e.g. right after
    the SQL Assistant executes a query and holds the resulting DataFrame).
    """

    records: list[dict[str, Any]] = Field(
        ..., description="DataFrame rows as JSON records (df.to_dict('records'))."
    )
    dataset_name: Optional[str] = Field(
        default=None, description="Optional label for the dataset, surfaced in metadata."
    )


# ---------------------------------------------------------------------------
# 1. Dataset summary
# ---------------------------------------------------------------------------

class DatasetSummary(BaseModel):
    total_rows: int
    total_columns: int
    duplicate_rows: int
    missing_values: int
    missing_percentage: float
    memory_usage_bytes: int
    memory_usage_readable: str
    numeric_column_count: int
    categorical_column_count: int
    datetime_column_count: int
    boolean_column_count: int


# ---------------------------------------------------------------------------
# 2. Numeric statistics
# ---------------------------------------------------------------------------

class NumericColumnStats(BaseModel):
    column: str
    count: int
    mean: Optional[float] = None
    median: Optional[float] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    sum: Optional[float] = None
    std: Optional[float] = None
    variance: Optional[float] = None
    p25: Optional[float] = None
    p50: Optional[float] = None
    p75: Optional[float] = None


# ---------------------------------------------------------------------------
# 3. KPIs
# ---------------------------------------------------------------------------

class KPI(BaseModel):
    label: str
    value: float
    format: str = Field(default="number", description="Display hint: number, currency, or percentage.")
    source_column: Optional[str] = None


# ---------------------------------------------------------------------------
# 4. Category analysis
# ---------------------------------------------------------------------------

class CategoryValue(BaseModel):
    value: str
    count: int
    percentage: float


class CategoryColumnAnalysis(BaseModel):
    column: str
    unique_count: int
    top_categories: list[CategoryValue]


# ---------------------------------------------------------------------------
# 5. Trend detection
# ---------------------------------------------------------------------------

class TrendPoint(BaseModel):
    period: str
    value: float


class TrendSeries(BaseModel):
    granularity: str  # day | week | month | year
    metric_column: str
    points: list[TrendPoint]


class TrendAnalysis(BaseModel):
    datetime_column: Optional[str] = None
    series: list[TrendSeries] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# 6. Correlation
# ---------------------------------------------------------------------------

class CorrelationMatrix(BaseModel):
    columns: list[str]
    matrix: list[list[Optional[float]]]


# ---------------------------------------------------------------------------
# 7. Outliers
# ---------------------------------------------------------------------------

class OutlierReport(BaseModel):
    column: str
    outlier_count: int
    outlier_percentage: float
    lower_bound: float
    upper_bound: float


# ---------------------------------------------------------------------------
# 8. Missing values
# ---------------------------------------------------------------------------

class MissingValueReport(BaseModel):
    column: str
    missing_count: int
    missing_percentage: float


# ---------------------------------------------------------------------------
# 9. Data quality score
# ---------------------------------------------------------------------------

class DataQualityScore(BaseModel):
    score: float
    reasoning: list[str]
    recommendations: list[str]


# ---------------------------------------------------------------------------
# 11. Chart recommendations
# ---------------------------------------------------------------------------

class ChartRecommendation(BaseModel):
    chart_type: str
    columns: list[str]
    reason: str


# ---------------------------------------------------------------------------
# 12. Metadata
# ---------------------------------------------------------------------------

class DashboardMetadata(BaseModel):
    generated_at: datetime
    analysis_time_ms: float
    dataset_name: Optional[str] = None
    row_count: int
    column_count: int


# ---------------------------------------------------------------------------
# Top-level response
# ---------------------------------------------------------------------------

class AnalyticsDashboardResponse(BaseModel):
    metadata: DashboardMetadata
    summary: DatasetSummary
    numeric_statistics: list[NumericColumnStats]
    kpis: list[KPI]
    category_analysis: list[CategoryColumnAnalysis]
    trend_analysis: TrendAnalysis
    correlation: Optional[CorrelationMatrix] = None
    outliers: list[OutlierReport]
    missing_report: list[MissingValueReport]
    quality_score: DataQualityScore
    insights: list[str]
    recommended_charts: list[ChartRecommendation]