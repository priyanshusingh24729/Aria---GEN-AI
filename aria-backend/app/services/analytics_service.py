"""
Business logic for the AI-powered Analytics Dashboard module.

`AnalyticsService` only *analyzes* a DataFrame — it never mutates the data
and never touches the SQL Assistant's execution path. The DataFrame it
receives is whatever the SQL Assistant already produced; this module has no
opinion about where it came from.

Column roles (numeric / categorical / datetime / boolean) are detected
dynamically per call and cached for the lifetime of a single
`analyze_dataframe()` invocation via `_ColumnProfile`, so every downstream
method reuses the same classification instead of re-scanning the frame.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    CategoryColumnAnalysis,
    CategoryValue,
    ChartRecommendation,
    CorrelationMatrix,
    DashboardMetadata,
    DataQualityScore,
    DatasetSummary,
    KPI,
    MissingValueReport,
    NumericColumnStats,
    OutlierReport,
    TrendAnalysis,
    TrendPoint,
    TrendSeries,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Domain exceptions
# ---------------------------------------------------------------------------

class AnalyticsError(Exception):
    """Base class for analytics-domain errors."""


class EmptyDataFrameError(AnalyticsError):
    """Raised when the incoming dataset has zero rows or zero columns."""


# ---------------------------------------------------------------------------
# Internal column classification cache
# ---------------------------------------------------------------------------

@dataclass
class _ColumnProfile:
    """Per-call cache of column roles so we classify the frame exactly once."""

    numeric_cols: list[str] = field(default_factory=list)
    categorical_cols: list[str] = field(default_factory=list)
    datetime_cols: list[str] = field(default_factory=list)
    boolean_cols: list[str] = field(default_factory=list)
    # Object columns that were coerced to datetime purely for analysis;
    # the original frame is left untouched, this is a parallel working copy.
    working_df: pd.DataFrame = None  # type: ignore[assignment]


# Keyword hints used for automatic KPI / chart inference. Matching is
# case-insensitive substring matching against column names — no schema
# assumptions, just common naming conventions.
_REVENUE_HINTS = ("revenue", "sales", "amount", "price", "total", "value", "cost")
_ORDER_HINTS = ("order", "qty", "quantity", "count", "units")
_DATETIME_NAME_HINTS = ("date", "time", "created", "updated", "timestamp", "day", "month", "year")
# Identifier-like columns (order_id, customer_id, product_id, ...) should never
# be picked as KPI sources even if their name contains a KPI hint substring
# ("order_id" contains "order") — summing/averaging an ID is meaningless.
_ID_NAME_HINTS = ("_id", "id_", "uuid", "guid")

_DATETIME_PARSE_SUCCESS_THRESHOLD = 0.85
_TOP_N_CATEGORIES = 10
_MAX_CORRELATION_COLUMNS = 30  # guardrail so wide datasets don't blow up the matrix response


class AnalyticsService:
    """Stateless analyzer: every public method is a pure function of a DataFrame."""

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------

    def analyze_dataframe(
        self, df: pd.DataFrame, dataset_name: Optional[str] = None
    ) -> AnalyticsDashboardResponse:
        """Run the full analysis pipeline and assemble the dashboard response."""
        start = time.perf_counter()

        if df is None or df.shape[0] == 0 or df.shape[1] == 0:
            raise EmptyDataFrameError("Cannot analyze an empty DataFrame (no rows or no columns).")

        profile = self._classify_columns(df)

        summary = self.dataset_summary(df, profile)
        numeric_stats = self.numeric_statistics(profile.working_df, profile)
        kpis = self.generate_kpis(profile.working_df, profile)
        categories = self.category_analysis(profile.working_df, profile)
        trend = self.trend_analysis(profile.working_df, profile)
        corr = self.correlation(profile.working_df, profile)
        outlier_reports = self.outliers(profile.working_df, profile)
        missing = self.missing_report(df)
        quality = self.quality_score(df, profile, summary, outlier_reports, missing)
        insights = self.generate_insights(profile.working_df, profile, summary, kpis, categories, trend, outlier_reports)
        charts = self.recommended_charts(profile)

        elapsed_ms = (time.perf_counter() - start) * 1000

        metadata = DashboardMetadata(
            generated_at=datetime.now(timezone.utc),
            analysis_time_ms=round(elapsed_ms, 2),
            dataset_name=dataset_name,
            row_count=int(df.shape[0]),
            column_count=int(df.shape[1]),
        )

        return AnalyticsDashboardResponse(
            metadata=metadata,
            summary=summary,
            numeric_statistics=numeric_stats,
            kpis=kpis,
            category_analysis=categories,
            trend_analysis=trend,
            correlation=corr,
            outliers=outlier_reports,
            missing_report=missing,
            quality_score=quality,
            insights=insights,
            recommended_charts=charts,
        )

    # ------------------------------------------------------------------
    # Column classification (run once per request)
    # ------------------------------------------------------------------

    def _classify_columns(self, df: pd.DataFrame) -> _ColumnProfile:
        """
        Dynamically classify every column as numeric, boolean, datetime, or
        categorical. Does not mutate the caller's frame — datetime coercion
        happens on a shallow working copy so repeated parsing downstream is
        cheap and consistent.
        """
        working = df.copy()
        profile = _ColumnProfile()

        for col in working.columns:
            series = working[col]

            if pd.api.types.is_bool_dtype(series):
                profile.boolean_cols.append(col)
                continue

            if pd.api.types.is_datetime64_any_dtype(series):
                profile.datetime_cols.append(col)
                continue

            if pd.api.types.is_numeric_dtype(series):
                profile.numeric_cols.append(col)
                continue

            # Object / string column: try to detect datetime-like content,
            # falling back to categorical if parsing isn't convincing.
            if self._looks_like_datetime(series, col):
                parsed = pd.to_datetime(series, errors="coerce", utc=False)
                working[col] = parsed
                profile.datetime_cols.append(col)
                continue

            profile.categorical_cols.append(col)

        profile.working_df = working
        return profile

    @staticmethod
    def _looks_like_datetime(series: pd.Series, col_name: str) -> bool:
        """Heuristic datetime detection: name hint OR a high parse-success rate."""
        non_null = series.dropna()
        if non_null.empty:
            return False

        name_hint = any(hint in col_name.lower() for hint in _DATETIME_NAME_HINTS)

        sample = non_null.sample(min(len(non_null), 200), random_state=0)
        parsed = pd.to_datetime(sample, errors="coerce")
        success_rate = parsed.notna().mean()

        # Require a stronger success rate when there's no name hint, to avoid
        # misclassifying numeric-looking strings (e.g. IDs) as dates.
        threshold = _DATETIME_PARSE_SUCCESS_THRESHOLD if name_hint else 0.98
        return bool(success_rate >= threshold)

    # ------------------------------------------------------------------
    # 1. Dataset summary
    # ------------------------------------------------------------------

    def dataset_summary(self, df: pd.DataFrame, profile: _ColumnProfile) -> DatasetSummary:
        total_cells = int(df.shape[0]) * int(df.shape[1])
        missing_values = int(df.isna().sum().sum())
        memory_bytes = int(df.memory_usage(deep=True).sum())

        return DatasetSummary(
            total_rows=int(df.shape[0]),
            total_columns=int(df.shape[1]),
            duplicate_rows=int(df.duplicated().sum()),
            missing_values=missing_values,
            missing_percentage=round((missing_values / total_cells * 100) if total_cells else 0.0, 2),
            memory_usage_bytes=memory_bytes,
            memory_usage_readable=self._human_bytes(memory_bytes),
            numeric_column_count=len(profile.numeric_cols),
            categorical_column_count=len(profile.categorical_cols),
            datetime_column_count=len(profile.datetime_cols),
            boolean_column_count=len(profile.boolean_cols),
        )

    @staticmethod
    def _human_bytes(n: int) -> str:
        size = float(n)
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} PB"

    # ------------------------------------------------------------------
    # 2. Numeric statistics
    # ------------------------------------------------------------------

    def numeric_statistics(self, df: pd.DataFrame, profile: _ColumnProfile) -> list[NumericColumnStats]:
        results: list[NumericColumnStats] = []
        for col in profile.numeric_cols:
            series = df[col].replace([np.inf, -np.inf], np.nan).dropna()
            if series.empty:
                results.append(NumericColumnStats(column=col, count=0))
                continue

            results.append(
                NumericColumnStats(
                    column=col,
                    count=int(series.count()),
                    mean=self._safe_float(series.mean()),
                    median=self._safe_float(series.median()),
                    minimum=self._safe_float(series.min()),
                    maximum=self._safe_float(series.max()),
                    sum=self._safe_float(series.sum()),
                    std=self._safe_float(series.std()) if len(series) > 1 else 0.0,
                    variance=self._safe_float(series.var()) if len(series) > 1 else 0.0,
                    p25=self._safe_float(series.quantile(0.25)),
                    p50=self._safe_float(series.quantile(0.50)),
                    p75=self._safe_float(series.quantile(0.75)),
                )
            )
        return results

    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        """Convert to a JSON-safe float, collapsing NaN/inf to None."""
        try:
            f = float(value)
        except (TypeError, ValueError):
            return None
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, 6)

    # ------------------------------------------------------------------
    # 3. KPIs
    # ------------------------------------------------------------------

    def generate_kpis(self, df: pd.DataFrame, profile: _ColumnProfile) -> list[KPI]:
        if not profile.numeric_cols:
            return []

        kpis: list[KPI] = []
        revenue_col = self._find_column_by_hint(profile.numeric_cols, _REVENUE_HINTS)
        order_col = self._find_column_by_hint(profile.numeric_cols, _ORDER_HINTS)

        if revenue_col:
            series = df[revenue_col].replace([np.inf, -np.inf], np.nan).dropna()
            if not series.empty:
                kpis.extend(
                    [
                        KPI(label="Total Revenue", value=self._safe_float(series.sum()) or 0.0,
                            format="currency", source_column=revenue_col),
                        KPI(label="Average Revenue", value=self._safe_float(series.mean()) or 0.0,
                            format="currency", source_column=revenue_col),
                        KPI(label="Highest Value", value=self._safe_float(series.max()) or 0.0,
                            format="currency", source_column=revenue_col),
                        KPI(label="Lowest Value", value=self._safe_float(series.min()) or 0.0,
                            format="currency", source_column=revenue_col),
                    ]
                )

        if order_col:
            series = df[order_col].replace([np.inf, -np.inf], np.nan).dropna()
            if not series.empty:
                kpis.extend(
                    [
                        KPI(label="Total Orders", value=self._safe_float(series.sum()) or 0.0,
                            format="number", source_column=order_col),
                        KPI(label="Average Orders", value=self._safe_float(series.mean()) or 0.0,
                            format="number", source_column=order_col),
                    ]
                )

        # Fallback: no obvious revenue/order columns — surface useful KPIs
        # from the first couple of non-identifier numeric columns instead of
        # returning nothing.
        if not kpis:
            fallback_cols = [
                c for c in profile.numeric_cols
                if c.lower() != "id" and not any(h in c.lower() for h in _ID_NAME_HINTS)
            ][:3]
            for col in fallback_cols:
                series = df[col].replace([np.inf, -np.inf], np.nan).dropna()
                if series.empty:
                    continue
                kpis.append(KPI(label=f"Average {col}", value=self._safe_float(series.mean()) or 0.0,
                                 format="number", source_column=col))
                kpis.append(KPI(label=f"Total {col}", value=self._safe_float(series.sum()) or 0.0,
                                 format="number", source_column=col))

        return kpis

    @staticmethod
    def _find_column_by_hint(columns: list[str], hints: tuple[str, ...]) -> Optional[str]:
        for col in columns:
            lowered = col.lower()
            if lowered == "id" or any(id_hint in lowered for id_hint in _ID_NAME_HINTS):
                continue  # never surface an identifier column as a KPI
            if any(hint in lowered for hint in hints):
                return col
        return None

    # ------------------------------------------------------------------
    # 4. Category analysis
    # ------------------------------------------------------------------

    def category_analysis(self, df: pd.DataFrame, profile: _ColumnProfile) -> list[CategoryColumnAnalysis]:
        results: list[CategoryColumnAnalysis] = []
        for col in profile.categorical_cols:
            series = df[col].dropna().astype(str)
            if series.empty:
                results.append(CategoryColumnAnalysis(column=col, unique_count=0, top_categories=[]))
                continue

            value_counts = series.value_counts().head(_TOP_N_CATEGORIES)
            total = len(series)
            top = [
                CategoryValue(value=str(idx), count=int(cnt), percentage=round(cnt / total * 100, 2))
                for idx, cnt in value_counts.items()
            ]
            results.append(
                CategoryColumnAnalysis(column=col, unique_count=int(series.nunique()), top_categories=top)
            )
        return results

    # ------------------------------------------------------------------
    # 5. Trend detection
    # ------------------------------------------------------------------

    def trend_analysis(self, df: pd.DataFrame, profile: _ColumnProfile) -> TrendAnalysis:
        if not profile.datetime_cols or not profile.numeric_cols:
            return TrendAnalysis(datetime_column=None, series=[])

        # Use the first detected datetime column and, for readability, the
        # first two numeric columns (KPIs already cover the rest).
        dt_col = profile.datetime_cols[0]
        metric_cols = profile.numeric_cols[:2]

        base = df[[dt_col] + metric_cols].dropna(subset=[dt_col])
        if base.empty:
            return TrendAnalysis(datetime_column=dt_col, series=[])

        base = base.set_index(dt_col)
        # NOTE: pandas >= 2.2 deprecated the bare "M"/"Y" aliases in favor of
        # "ME"/"YE" (month/year *end*). Using the new aliases keeps this
        # working on both the current and near-future pandas releases.
        freq_map = {"day": "D", "week": "W", "month": "ME", "year": "YE"}

        series_out: list[TrendSeries] = []
        for metric_col in metric_cols:
            for granularity, freq in freq_map.items():
                try:
                    grouped = base[metric_col].resample(freq).sum(min_count=1).dropna()
                except Exception:  # pragma: no cover - defensive, resample can be finicky on odd indexes
                    continue
                if grouped.empty:
                    continue
                points = [
                    TrendPoint(period=str(period.date() if hasattr(period, "date") else period),
                               value=self._safe_float(val) or 0.0)
                    for period, val in grouped.items()
                ]
                series_out.append(TrendSeries(granularity=granularity, metric_column=metric_col, points=points))

        return TrendAnalysis(datetime_column=dt_col, series=series_out)

    # ------------------------------------------------------------------
    # 6. Correlation
    # ------------------------------------------------------------------

    def correlation(self, df: pd.DataFrame, profile: _ColumnProfile) -> Optional[CorrelationMatrix]:
        cols = profile.numeric_cols[:_MAX_CORRELATION_COLUMNS]
        if len(cols) < 2:
            return None

        corr_df = df[cols].replace([np.inf, -np.inf], np.nan).corr(method="pearson")
        matrix = [
            [self._safe_float(v) for v in row]
            for row in corr_df.to_numpy()
        ]
        return CorrelationMatrix(columns=cols, matrix=matrix)

    # ------------------------------------------------------------------
    # 7. Outlier detection (IQR method)
    # ------------------------------------------------------------------

    def outliers(self, df: pd.DataFrame, profile: _ColumnProfile) -> list[OutlierReport]:
        reports: list[OutlierReport] = []
        for col in profile.numeric_cols:
            series = df[col].replace([np.inf, -np.inf], np.nan).dropna()
            if len(series) < 4:
                continue

            q1, q3 = series.quantile(0.25), series.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue

            lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            mask = (series < lower) | (series > upper)
            count = int(mask.sum())
            if count == 0:
                continue

            reports.append(
                OutlierReport(
                    column=col,
                    outlier_count=count,
                    outlier_percentage=round(count / len(series) * 100, 2),
                    lower_bound=self._safe_float(lower) or 0.0,
                    upper_bound=self._safe_float(upper) or 0.0,
                )
            )
        return reports

    # ------------------------------------------------------------------
    # 8. Missing value report
    # ------------------------------------------------------------------

    def missing_report(self, df: pd.DataFrame) -> list[MissingValueReport]:
        total_rows = len(df)
        if total_rows == 0:
            return []

        missing_counts = df.isna().sum()
        return [
            MissingValueReport(
                column=col,
                missing_count=int(count),
                missing_percentage=round(count / total_rows * 100, 2),
            )
            for col, count in missing_counts.items()
            if count > 0
        ]

    # ------------------------------------------------------------------
    # 9. Data quality score
    # ------------------------------------------------------------------

    def quality_score(
        self,
        df: pd.DataFrame,
        profile: _ColumnProfile,
        summary: DatasetSummary,
        outlier_reports: list[OutlierReport],
        missing: list[MissingValueReport],
    ) -> DataQualityScore:
        score = 100.0
        reasoning: list[str] = []
        recommendations: list[str] = []

        # Duplicates
        dup_pct = (summary.duplicate_rows / summary.total_rows * 100) if summary.total_rows else 0.0
        if dup_pct > 0:
            penalty = min(20.0, dup_pct * 0.5)
            score -= penalty
            reasoning.append(f"{dup_pct:.1f}% of rows are exact duplicates.")
            recommendations.append("Remove or investigate duplicate rows.")

        # Missing values
        if summary.missing_percentage > 0:
            penalty = min(25.0, summary.missing_percentage * 0.6)
            score -= penalty
            reasoning.append(f"{summary.missing_percentage:.1f}% of all cells are missing.")
            recommendations.append("Impute or drop columns/rows with high missingness.")

        # Constant columns (zero variance / single unique value)
        constant_cols = [col for col in df.columns if df[col].nunique(dropna=True) <= 1]
        if constant_cols:
            score -= min(15.0, len(constant_cols) * 5.0)
            reasoning.append(f"{len(constant_cols)} column(s) contain only a single value: {', '.join(constant_cols[:5])}.")
            recommendations.append("Drop constant columns — they carry no analytical signal.")

        # Mixed data types within object columns (heuristic: more than one
        # underlying Python type among non-null values).
        mixed_type_cols = []
        for col in profile.categorical_cols:
            non_null = df[col].dropna()
            if non_null.empty:
                continue
            if non_null.map(type).nunique() > 1:
                mixed_type_cols.append(col)
        if mixed_type_cols:
            score -= min(10.0, len(mixed_type_cols) * 5.0)
            reasoning.append(f"{len(mixed_type_cols)} column(s) contain mixed data types: {', '.join(mixed_type_cols[:5])}.")
            recommendations.append("Normalize mixed-type columns to a single consistent type.")

        # Outliers
        if outlier_reports:
            avg_outlier_pct = sum(o.outlier_percentage for o in outlier_reports) / len(outlier_reports)
            penalty = min(15.0, avg_outlier_pct * 0.5)
            score -= penalty
            worst = max(outlier_reports, key=lambda o: o.outlier_percentage)
            reasoning.append(f"Outliers detected in {len(outlier_reports)} numeric column(s), worst: {worst.column} ({worst.outlier_percentage:.1f}%).")
            recommendations.append("Review outliers — decide whether to cap, transform, or keep them.")

        if not reasoning:
            reasoning.append("No significant data quality issues detected.")

        score = round(max(0.0, min(100.0, score)), 1)
        return DataQualityScore(score=score, reasoning=reasoning, recommendations=recommendations)

    # ------------------------------------------------------------------
    # 10. AI-ready insights (rule-based, no LLM)
    # ------------------------------------------------------------------

    def generate_insights(
        self,
        df: pd.DataFrame,
        profile: _ColumnProfile,
        summary: DatasetSummary,
        kpis: list[KPI],
        categories: list[CategoryColumnAnalysis],
        trend: TrendAnalysis,
        outlier_reports: list[OutlierReport],
    ) -> list[str]:
        insights: list[str] = []

        # Trend direction from the coarsest available series (year > month > week > day)
        if trend.series:
            preferred_order = ["year", "month", "week", "day"]
            for granularity in preferred_order:
                candidate = next((s for s in trend.series if s.granularity == granularity), None)
                if candidate and len(candidate.points) >= 2:
                    first_val, last_val = candidate.points[0].value, candidate.points[-1].value
                    if first_val:
                        change_pct = (last_val - first_val) / abs(first_val) * 100
                        direction = "increased" if change_pct > 0 else "decreased"
                        insights.append(
                            f"{candidate.metric_column} {direction} by {abs(change_pct):.1f}% "
                            f"from the first to the last {granularity}."
                        )
                    break

        # Dominant category contribution
        for cat in categories:
            if not cat.top_categories:
                continue
            top = cat.top_categories[0]
            if top.percentage >= 30:
                insights.append(f"'{top.value}' contributes {top.percentage:.1f}% of all {cat.column} records.")

        # KPI-based insight: flag unusually high averages relative to median-like spread
        for kpi in kpis:
            if kpi.label.startswith("Average") and kpi.value and kpi.value > 0:
                insights.append(f"{kpi.label} is {kpi.value:,.2f}.")
                break  # one representative KPI insight is enough to avoid noise

        # Outlier callouts
        for report in outlier_reports:
            if report.outlier_percentage >= 5:
                insights.append(f"{report.column} has a notable number of outliers ({report.outlier_percentage:.1f}% of values).")

        # Data quality callout
        if summary.missing_percentage >= 10:
            insights.append(f"Dataset has significant missing data ({summary.missing_percentage:.1f}% of all cells).")
        if summary.duplicate_rows > 0:
            insights.append(f"Dataset contains {summary.duplicate_rows} duplicate row(s).")

        if not insights:
            insights.append("No strong patterns detected — dataset appears evenly distributed with no major anomalies.")

        return insights

    # ------------------------------------------------------------------
    # 11. Recommended charts
    # ------------------------------------------------------------------

    def recommended_charts(self, profile: _ColumnProfile) -> list[ChartRecommendation]:
        charts: list[ChartRecommendation] = []
        numeric = profile.numeric_cols
        categorical = profile.categorical_cols
        datetime_cols = profile.datetime_cols

        if categorical and numeric:
            charts.append(
                ChartRecommendation(
                    chart_type="Bar Chart",
                    columns=[categorical[0], numeric[0]],
                    reason=f"Compare {numeric[0]} across categories in {categorical[0]}.",
                )
            )

        if categorical:
            charts.append(
                ChartRecommendation(
                    chart_type="Pie Chart",
                    columns=[categorical[0]],
                    reason=f"Show the relative share of each value in {categorical[0]}.",
                )
            )

        if numeric:
            charts.append(
                ChartRecommendation(
                    chart_type="Histogram",
                    columns=[numeric[0]],
                    reason=f"Visualize the distribution of {numeric[0]}.",
                )
            )

        if len(numeric) >= 2:
            charts.append(
                ChartRecommendation(
                    chart_type="Scatter Plot",
                    columns=[numeric[0], numeric[1]],
                    reason=f"Explore the relationship between {numeric[0]} and {numeric[1]}.",
                )
            )

        if datetime_cols and numeric:
            charts.append(
                ChartRecommendation(
                    chart_type="Line Chart",
                    columns=[datetime_cols[0], numeric[0]],
                    reason=f"Track {numeric[0]} over time using {datetime_cols[0]}.",
                )
            )

        if len(numeric) >= 3:
            charts.append(
                ChartRecommendation(
                    chart_type="Heatmap",
                    columns=numeric[:_MAX_CORRELATION_COLUMNS],
                    reason="Visualize pairwise correlation across numeric columns.",
                )
            )

        return charts


# Singleton instance, matching the module-level pattern used by
# `data_cleaning_service` elsewhere in the codebase.
analytics_service = AnalyticsService()