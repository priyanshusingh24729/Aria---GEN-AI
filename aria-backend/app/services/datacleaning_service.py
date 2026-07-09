"""
Service layer for the AI-powered Data Cleaning module.

All business logic (dataset loading, analysis, cleaning, feature engineering,
feature extraction, reporting) lives here. The API layer only validates
requests and delegates to `DataCleaningService`.
"""
from __future__ import annotations

import io
import json
import logging
import re
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

from app.schemas.datacleaning import (
    AnalysisReport,
    CleaningOperation,
    CleaningReport,
    CleaningResultItem,
    ColumnGroups,
    ConstantColumnInfo,
    CorrelatedPair,
    DatasetOverview,
    DuplicateReport,
    FeatureEngineeringId,
    FeatureEngineeringOperation,
    FeatureEngineeringResultItem,
    FeatureEngineeringSuggestion,
    FeatureExtractionMethod,
    FeatureImportance,
    InvalidDataTypeIssue,
    LowVarianceColumn,
    MissingValueColumn,
    MissingValuesReport,
    MissingValueStrategy,
    MixedCaseIssue,
    OperationId,
    OutlierColumnInfo,
    OutlierMethod,
    Recommendation,
    SupportedFileType,
    TargetTypeCast,
    UniqueValueInfo,
    WhitespaceIssue,
)

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Exceptions
# --------------------------------------------------------------------------- #

class DataCleaningError(Exception):
    """Base exception for the data cleaning module."""


class UnsupportedFileTypeError(DataCleaningError):
    pass


class SessionNotFoundError(DataCleaningError):
    pass


class InvalidOperationError(DataCleaningError):
    pass


class ColumnNotFoundError(DataCleaningError):
    pass


# --------------------------------------------------------------------------- #
# Session store
# --------------------------------------------------------------------------- #

@dataclass
class DatasetSession:
    session_id: str
    filename: str
    df: pd.DataFrame
    original_row_count: int
    original_column_count: int
    created_at: float = field(default_factory=time.time)
    operations_applied: list[str] = field(default_factory=list)
    columns_renamed: dict[str, str] = field(default_factory=dict)
    features_created: list[str] = field(default_factory=list)
    features_removed: list[str] = field(default_factory=list)
    missing_values_removed: int = 0
    duplicates_removed: int = 0
    feature_importance: list[FeatureImportance] = field(default_factory=list)


class SessionStore:
    """
    Thread-safe in-memory store mapping session_id -> DatasetSession.

    NOTE: for a multi-worker / multi-instance production deployment, replace
    this with a shared backing store (e.g. Redis, or a temp-file + DB row
    per session) so sessions survive across worker processes. The public
    interface below is deliberately narrow so the backing implementation
    can be swapped without touching callers.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, DatasetSession] = {}
        self._lock = threading.Lock()

    def create(self, df: pd.DataFrame, filename: str) -> DatasetSession:
        session_id = str(uuid.uuid4())
        session = DatasetSession(
            session_id=session_id,
            filename=filename,
            df=df,
            original_row_count=len(df),
            original_column_count=df.shape[1],
        )
        with self._lock:
            self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> DatasetSession:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            raise SessionNotFoundError(f"Session '{session_id}' was not found.")
        return session

    def update_dataframe(self, session_id: str, df: pd.DataFrame) -> None:
        session = self.get(session_id)
        with self._lock:
            session.df = df

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


# --------------------------------------------------------------------------- #
# Dataset loading
# --------------------------------------------------------------------------- #

class DatasetLoader:
    """Reads uploaded files into Pandas DataFrames."""

    EXTENSION_MAP = {
        "csv": SupportedFileType.CSV,
        "xlsx": SupportedFileType.XLSX,
        "xls": SupportedFileType.XLS,
        "json": SupportedFileType.JSON,
    }

    @classmethod
    def detect_file_type(cls, filename: str) -> SupportedFileType:
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        file_type = cls.EXTENSION_MAP.get(extension)
        if file_type is None:
            raise UnsupportedFileTypeError(
                f"Unsupported file extension '.{extension}'. "
                f"Supported types: {', '.join(cls.EXTENSION_MAP)}."
            )
        return file_type

    @classmethod
    def load(cls, filename: str, content: bytes) -> pd.DataFrame:
        file_type = cls.detect_file_type(filename)
        buffer = io.BytesIO(content)
        try:
            if file_type == SupportedFileType.CSV:
                return pd.read_csv(buffer)
            if file_type == SupportedFileType.XLSX:
                return pd.read_excel(buffer, engine="openpyxl")
            if file_type == SupportedFileType.XLS:
                return pd.read_excel(buffer, engine="xlrd")
            if file_type == SupportedFileType.JSON:
                return pd.read_json(buffer)
        except Exception as exc:  # noqa: BLE001 - surfaced as a clean domain error
            raise DataCleaningError(f"Failed to parse '{filename}': {exc}") from exc
        raise UnsupportedFileTypeError(f"Unhandled file type: {file_type}")


# --------------------------------------------------------------------------- #
# Analysis
# --------------------------------------------------------------------------- #

class DatasetAnalyzer:
    """Produces a read-only analysis report. Never mutates the DataFrame."""

    CORRELATION_THRESHOLD = 0.9
    LOW_VARIANCE_THRESHOLD = 0.01
    ID_UNIQUE_RATIO_THRESHOLD = 0.98

    def analyze(self, df: pd.DataFrame) -> AnalysisReport:
        overview = self._overview(df)
        missing = self._missing_values(df)
        duplicates = self._duplicates(df)
        invalid_types = self._invalid_data_types(df)
        column_groups = self._column_groups(df)
        unique_values = self._unique_values(df)
        null_columns = [c for c in df.columns if df[c].isna().all()]
        constant_columns = self._constant_columns(df)
        whitespace_issues = self._whitespace_issues(df)
        mixed_case_issues = self._mixed_case_issues(df)
        outliers = self._outliers_iqr(df, column_groups.numerical)
        correlated = self._highly_correlated(df, column_groups.numerical)
        low_variance = self._low_variance(df, column_groups.numerical)
        potential_ids = self._potential_id_columns(df)
        potential_targets = self._potential_target_columns(df, column_groups, potential_ids)

        return AnalysisReport(
            overview=overview,
            missing_values=missing,
            duplicates=duplicates,
            invalid_data_types=invalid_types,
            column_groups=column_groups,
            unique_values=unique_values,
            null_columns=null_columns,
            constant_columns=constant_columns,
            whitespace_issues=whitespace_issues,
            mixed_case_issues=mixed_case_issues,
            outliers=outliers,
            highly_correlated_features=correlated,
            low_variance_columns=low_variance,
            potential_target_columns=potential_targets,
            potential_id_columns=potential_ids,
        )

    def recommend(self, report: AnalysisReport) -> list[Recommendation]:
        recs: list[Recommendation] = []

        if report.duplicates.duplicate_row_count > 0:
            recs.append(Recommendation(
                id=OperationId.REMOVE_DUPLICATE_ROWS,
                title="Remove Duplicate Rows",
                description=f"{report.duplicates.duplicate_row_count} duplicate rows found.",
            ))
        if report.duplicates.duplicate_column_count > 0:
            recs.append(Recommendation(
                id=OperationId.REMOVE_DUPLICATE_COLUMNS,
                title="Remove Duplicate Columns",
                description=f"{report.duplicates.duplicate_column_count} duplicate columns found.",
            ))
        if report.missing_values.total_missing > 0:
            recs.append(Recommendation(
                id=OperationId.FILL_MISSING,
                title="Handle Missing Values",
                description=f"{report.missing_values.total_missing} missing values detected "
                             f"across {len(report.missing_values.columns_affected)} columns.",
            ))
        if report.invalid_data_types:
            cols = ", ".join(i.column for i in report.invalid_data_types[:5])
            recs.append(Recommendation(
                id=OperationId.FIX_DATA_TYPES,
                title="Fix Data Types",
                description=f"Suspicious data types detected in: {cols}.",
            ))
        if report.whitespace_issues:
            recs.append(Recommendation(
                id=OperationId.TRIM_WHITESPACE,
                title="Trim Whitespace",
                description=f"{len(report.whitespace_issues)} columns contain leading/trailing whitespace.",
            ))
        if report.mixed_case_issues:
            recs.append(Recommendation(
                id=OperationId.STANDARDIZE_TEXT,
                title="Standardize Text Casing",
                description=f"{len(report.mixed_case_issues)} columns contain inconsistent casing "
                             f"(e.g. Male / male / MALE).",
            ))
        if report.constant_columns:
            recs.append(Recommendation(
                id=OperationId.REMOVE_CONSTANT_COLUMNS,
                title="Remove Constant Columns",
                description=f"{len(report.constant_columns)} columns contain a single repeated value.",
            ))
        if report.low_variance_columns:
            recs.append(Recommendation(
                id=OperationId.REMOVE_LOW_VARIANCE_COLUMNS,
                title="Remove Low Variance Columns",
                description=f"{len(report.low_variance_columns)} numeric columns show near-zero variance.",
            ))
        if report.highly_correlated_features:
            recs.append(Recommendation(
                id=OperationId.REMOVE_HIGHLY_CORRELATED,
                title="Remove Highly Correlated Features",
                description=f"{len(report.highly_correlated_features)} column pairs are highly correlated "
                             f"(|r| >= {self.CORRELATION_THRESHOLD}).",
            ))
        if report.outliers:
            total_outliers = sum(o.outlier_count for o in report.outliers)
            recs.append(Recommendation(
                id=OperationId.REMOVE_OUTLIERS,
                title="Remove Outliers",
                description=f"{total_outliers} potential outliers detected via IQR across "
                             f"{len(report.outliers)} columns.",
            ))
        if report.null_columns:
            recs.append(Recommendation(
                id=OperationId.DROP_COLUMNS_WITH_NULLS,
                title="Drop Fully Empty Columns",
                description=f"{len(report.null_columns)} columns are entirely empty.",
            ))
        if report.column_groups.numerical:
            recs.append(Recommendation(
                id=OperationId.NORMALIZE,
                title="Normalize Numeric Columns",
                description="Scale numeric columns to a common [0, 1] range for modeling.",
            ))
        return recs

    # -- helpers -------------------------------------------------------- #

    def _overview(self, df: pd.DataFrame) -> DatasetOverview:
        memory_bytes = int(df.memory_usage(deep=True).sum())
        return DatasetOverview(
            rows=len(df),
            columns=df.shape[1],
            memory_usage_bytes=memory_bytes,
            memory_usage_human=self._human_bytes(memory_bytes),
            dtypes={c: str(t) for c, t in df.dtypes.items()},
        )

    @staticmethod
    def _human_bytes(n: int) -> str:
        value = float(n)
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if value < 1024:
                return f"{value:.2f} {unit}"
            value /= 1024
        return f"{value:.2f} PB"

    def _missing_values(self, df: pd.DataFrame) -> MissingValuesReport:
        counts = df.isna().sum()
        affected = [
            MissingValueColumn(
                column=col,
                missing_count=int(count),
                missing_percentage=round(float(count) / len(df) * 100, 2) if len(df) else 0.0,
            )
            for col, count in counts.items() if count > 0
        ]
        return MissingValuesReport(total_missing=int(counts.sum()), columns_affected=affected)

    def _duplicates(self, df: pd.DataFrame) -> DuplicateReport:
        duplicate_rows = int(df.duplicated().sum())
        duplicate_cols: list[str] = []
        seen: dict[str, str] = {}
        for col in df.columns:
            try:
                fingerprint = pd.util.hash_pandas_object(df[col], index=False).sum()
            except TypeError:
                continue
            key = str(fingerprint)
            if key in seen:
                duplicate_cols.append(col)
            else:
                seen[key] = col
        return DuplicateReport(
            duplicate_row_count=duplicate_rows,
            duplicate_column_count=len(duplicate_cols),
            duplicate_column_names=duplicate_cols,
        )

    def _invalid_data_types(self, df: pd.DataFrame) -> list[InvalidDataTypeIssue]:
        issues: list[InvalidDataTypeIssue] = []
        for col in df.columns:
            series = df[col]
            if series.dtype != object:
                continue
            non_null = series.dropna()
            if non_null.empty:
                continue
            sample = non_null.astype(str).head(200)

            numeric_like = sample.str.replace(",", "", regex=False).str.match(
                r"^-?\d+(\.\d+)?$"
            )
            if numeric_like.mean() > 0.8:
                issues.append(InvalidDataTypeIssue(
                    column=col, current_dtype="object", suspected_dtype="numeric",
                    reason=f"'{col}' looks numeric but is stored as text.",
                ))
                continue

            parsed_dates = pd.to_datetime(sample, errors="coerce", format="mixed")
            if parsed_dates.notna().mean() > 0.8:
                issues.append(InvalidDataTypeIssue(
                    column=col, current_dtype="object", suspected_dtype="datetime",
                    reason=f"'{col}' looks like a date but is stored as text.",
                ))
        return issues

    def _column_groups(self, df: pd.DataFrame) -> ColumnGroups:
        numerical, categorical, datetime_cols, boolean_cols = [], [], [], []
        for col in df.columns:
            dtype = df[col].dtype
            if pd.api.types.is_bool_dtype(dtype):
                boolean_cols.append(col)
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                datetime_cols.append(col)
            elif pd.api.types.is_numeric_dtype(dtype):
                numerical.append(col)
            else:
                categorical.append(col)
        return ColumnGroups(
            categorical=categorical, numerical=numerical,
            datetime=datetime_cols, boolean=boolean_cols,
        )

    def _unique_values(self, df: pd.DataFrame) -> list[UniqueValueInfo]:
        result = []
        n = len(df) or 1
        for col in df.columns:
            nunique = int(df[col].nunique(dropna=True))
            result.append(UniqueValueInfo(column=col, unique_count=nunique, unique_ratio=round(nunique / n, 4)))
        return result

    def _constant_columns(self, df: pd.DataFrame) -> list[ConstantColumnInfo]:
        result = []
        for col in df.columns:
            non_null = df[col].dropna()
            if not non_null.empty and non_null.nunique() == 1:
                result.append(ConstantColumnInfo(column=col, constant_value=non_null.iloc[0]))
        return result

    def _whitespace_issues(self, df: pd.DataFrame) -> list[WhitespaceIssue]:
        result = []
        for col in df.select_dtypes(include="object").columns:
            mask = df[col].astype(str).str.strip() != df[col].astype(str)
            affected = int(mask.sum())
            if affected > 0:
                result.append(WhitespaceIssue(column=col, affected_rows=affected))
        return result

    def _mixed_case_issues(self, df: pd.DataFrame) -> list[MixedCaseIssue]:
        result = []
        for col in df.select_dtypes(include="object").columns:
            non_null = df[col].dropna().astype(str)
            if non_null.empty:
                continue
            lowered = non_null.str.lower()
            grouped = non_null.groupby(lowered).nunique()
            inconsistent = grouped[grouped > 1]
            if not inconsistent.empty:
                examples: list[str] = []
                for lower_val in inconsistent.index[:3]:
                    variants = non_null[lowered == lower_val].unique().tolist()
                    examples.extend(variants[:3])
                result.append(MixedCaseIssue(column=col, example_variants=examples[:6]))
        return result

    def _outliers_iqr(self, df: pd.DataFrame, numeric_columns: list[str]) -> list[OutlierColumnInfo]:
        result = []
        for col in numeric_columns:
            series = df[col].dropna()
            if series.empty:
                continue
            q1, q3 = series.quantile(0.25), series.quantile(0.75)
            iqr = q3 - q1
            if iqr == 0:
                continue
            lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            count = int(((series < lower) | (series > upper)).sum())
            if count > 0:
                result.append(OutlierColumnInfo(
                    column=col, outlier_count=count,
                    lower_bound=round(float(lower), 4), upper_bound=round(float(upper), 4),
                ))
        return result

    def _highly_correlated(self, df: pd.DataFrame, numeric_columns: list[str]) -> list[CorrelatedPair]:
        if len(numeric_columns) < 2:
            return []
        corr = df[numeric_columns].corr(numeric_only=True).abs()
        pairs = []
        seen = set()
        for col_a in corr.columns:
            for col_b in corr.columns:
                if col_a == col_b or (col_b, col_a) in seen:
                    continue
                seen.add((col_a, col_b))
                value = corr.loc[col_a, col_b]
                if pd.notna(value) and value >= self.CORRELATION_THRESHOLD:
                    pairs.append(CorrelatedPair(column_a=col_a, column_b=col_b, correlation=round(float(value), 4)))
        return pairs

    def _low_variance(self, df: pd.DataFrame, numeric_columns: list[str]) -> list[LowVarianceColumn]:
        result = []
        for col in numeric_columns:
            series = df[col].dropna()
            if series.empty:
                continue
            variance = float(series.var())
            if variance < self.LOW_VARIANCE_THRESHOLD:
                result.append(LowVarianceColumn(column=col, variance=round(variance, 6)))
        return result

    def _potential_id_columns(self, df: pd.DataFrame) -> list[str]:
        result = []
        n = len(df) or 1
        for col in df.columns:
            name_hints_id = bool(re.search(r"(^id$|_id$|^id_|uuid|guid)", col, re.IGNORECASE))
            unique_ratio = df[col].nunique(dropna=True) / n
            if name_hints_id or unique_ratio >= self.ID_UNIQUE_RATIO_THRESHOLD:
                result.append(col)
        return result

    def _potential_target_columns(
        self, df: pd.DataFrame, groups: ColumnGroups, id_columns: list[str]
    ) -> list[str]:
        candidates = []
        for col in groups.categorical + groups.numerical + groups.boolean:
            if col in id_columns:
                continue
            nunique = df[col].nunique(dropna=True)
            if 1 < nunique <= 20 or col.lower() in {"target", "label", "class", "outcome", "churn", "y"}:
                candidates.append(col)
        return candidates


# --------------------------------------------------------------------------- #
# Cleaning
# --------------------------------------------------------------------------- #

class DataCleaner:
    """Implements every supported cleaning operation. Each method returns
    (new_dataframe, details_dict) and never mutates the input in place."""

    def apply(self, df: pd.DataFrame, operation: CleaningOperation) -> tuple[pd.DataFrame, dict[str, Any]]:
        handler = self._HANDLERS.get(operation.id)
        if handler is None:
            raise InvalidOperationError(f"Unknown cleaning operation '{operation.id}'.")
        return handler(self, df, operation.params)

    @staticmethod
    def _require_columns(df: pd.DataFrame, columns: list[str]) -> None:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise ColumnNotFoundError(f"Columns not found: {', '.join(missing)}")

    def _remove_duplicate_rows(self, df, params):
        before = len(df)
        result = df.drop_duplicates().reset_index(drop=True)
        return result, {"rows_removed": before - len(result)}

    def _remove_duplicate_columns(self, df, params):
        transposed_dupes = df.T.duplicated()
        cols_to_drop = df.columns[transposed_dupes].tolist()
        return df.drop(columns=cols_to_drop), {"columns_removed": cols_to_drop}

    def _fill_missing(self, df, params):
        strategy = MissingValueStrategy(params.get("strategy", MissingValueStrategy.MEAN))
        columns = params.get("columns") or df.columns[df.isna().any()].tolist()
        self._require_columns(df, columns)
        result = df.copy()
        filled_counts: dict[str, int] = {}
        for col in columns:
            missing_before = int(result[col].isna().sum())
            if missing_before == 0:
                continue
            if strategy == MissingValueStrategy.MEAN and pd.api.types.is_numeric_dtype(result[col]):
                result[col] = result[col].fillna(result[col].mean())
            elif strategy == MissingValueStrategy.MEDIAN and pd.api.types.is_numeric_dtype(result[col]):
                result[col] = result[col].fillna(result[col].median())
            elif strategy == MissingValueStrategy.MODE:
                mode = result[col].mode(dropna=True)
                if not mode.empty:
                    result[col] = result[col].fillna(mode.iloc[0])
            elif strategy == MissingValueStrategy.CONSTANT:
                result[col] = result[col].fillna(params.get("constant_value"))
            elif strategy == MissingValueStrategy.FORWARD_FILL:
                result[col] = result[col].ffill()
            elif strategy == MissingValueStrategy.BACKWARD_FILL:
                result[col] = result[col].bfill()
            else:
                # Non-numeric column with mean/median requested -> fall back to mode.
                mode = result[col].mode(dropna=True)
                if not mode.empty:
                    result[col] = result[col].fillna(mode.iloc[0])
            filled_counts[col] = missing_before - int(result[col].isna().sum())
        return result, {"strategy": strategy.value, "filled_counts": filled_counts}

    def _drop_rows_with_nulls(self, df, params):
        columns = params.get("columns")
        before = len(df)
        result = df.dropna(subset=columns) if columns else df.dropna()
        return result.reset_index(drop=True), {"rows_removed": before - len(result)}

    def _drop_columns_with_nulls(self, df, params):
        threshold = params.get("threshold", 1.0)  # drop if missing fraction >= threshold
        n = len(df) or 1
        cols_to_drop = [c for c in df.columns if df[c].isna().sum() / n >= threshold]
        return df.drop(columns=cols_to_drop), {"columns_removed": cols_to_drop}

    def _trim_whitespace(self, df, params):
        columns = params.get("columns") or df.select_dtypes(include="object").columns.tolist()
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            result[col] = result[col].apply(lambda v: v.strip() if isinstance(v, str) else v)
        return result, {"columns_trimmed": columns}

    def _standardize_text(self, df, params):
        columns = params.get("columns") or df.select_dtypes(include="object").columns.tolist()
        mode = params.get("mode", "title")  # title | lower | upper
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            stripped = result[col].apply(lambda v: v.strip() if isinstance(v, str) else v)
            if mode == "lower":
                result[col] = stripped.apply(lambda v: v.lower() if isinstance(v, str) else v)
            elif mode == "upper":
                result[col] = stripped.apply(lambda v: v.upper() if isinstance(v, str) else v)
            else:
                result[col] = stripped.apply(lambda v: v.title() if isinstance(v, str) else v)
        return result, {"columns_standardized": columns, "mode": mode}

    def _rename_columns(self, df, params):
        mapping: dict[str, str] = dict(params.get("mapping") or {})
        if params.get("auto_snake_case"):
            for col in df.columns:
                mapping.setdefault(col, self._to_snake_case(col))
        self._require_columns(df, list(mapping.keys()))
        return df.rename(columns=mapping), {"renamed": mapping}

    @staticmethod
    def _to_snake_case(name: str) -> str:
        name = re.sub(r"[^\w\s]", "", name)
        name = re.sub(r"(?<!^)(?<!_)(?=[A-Z])", "_", name.strip())
        name = re.sub(r"\s+", "_", name)
        name = re.sub(r"_+", "_", name)
        return name.lower().strip("_")

    def _fix_data_types(self, df, params):
        columns: dict[str, str] = params.get("columns") or {}
        self._require_columns(df, list(columns.keys()))
        result = df.copy()
        applied = {}
        for col, target in columns.items():
            target_type = TargetTypeCast(target)
            try:
                if target_type == TargetTypeCast.NUMERIC:
                    cleaned = result[col].astype(str).str.replace(r"[,$%\s]", "", regex=True)
                    result[col] = pd.to_numeric(cleaned, errors="coerce")
                elif target_type == TargetTypeCast.DATETIME:
                    result[col] = pd.to_datetime(result[col], errors="coerce", format="mixed")
                elif target_type == TargetTypeCast.CATEGORY:
                    result[col] = result[col].astype("category")
                applied[col] = target_type.value
            except Exception as exc:  # noqa: BLE001
                raise DataCleaningError(f"Failed to cast '{col}' to {target}: {exc}") from exc
        return result, {"applied": applied}

    def _remove_constant_columns(self, df, params):
        cols_to_drop = [c for c in df.columns if df[c].dropna().nunique() <= 1]
        return df.drop(columns=cols_to_drop), {"columns_removed": cols_to_drop}

    def _remove_low_variance_columns(self, df, params):
        threshold = float(params.get("threshold", 0.01))
        numeric_cols = df.select_dtypes(include=np.number).columns
        cols_to_drop = [c for c in numeric_cols if df[c].var(skipna=True) < threshold]
        return df.drop(columns=cols_to_drop), {"columns_removed": cols_to_drop, "threshold": threshold}

    def _remove_highly_correlated(self, df, params):
        threshold = float(params.get("threshold", 0.9))
        numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
        if len(numeric_cols) < 2:
            return df, {"columns_removed": []}
        corr = df[numeric_cols].corr(numeric_only=True).abs()
        upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
        to_drop = [col for col in upper.columns if (upper[col] >= threshold).any()]
        return df.drop(columns=to_drop), {"columns_removed": to_drop, "threshold": threshold}

    def _normalize(self, df, params):
        columns = params.get("columns") or df.select_dtypes(include=np.number).columns.tolist()
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            col_min, col_max = result[col].min(), result[col].max()
            if col_max != col_min:
                result[col] = (result[col] - col_min) / (col_max - col_min)
            else:
                result[col] = 0.0
        return result, {"columns_normalized": columns, "method": "minmax"}

    def _standardize(self, df, params):
        columns = params.get("columns") or df.select_dtypes(include=np.number).columns.tolist()
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            std = result[col].std()
            mean = result[col].mean()
            result[col] = (result[col] - mean) / std if std else 0.0
        return result, {"columns_standardized": columns, "method": "zscore"}

    def _one_hot_encode(self, df, params):
        columns = params["columns"]
        self._require_columns(df, columns)
        result = pd.get_dummies(df, columns=columns, prefix=columns)
        new_columns = [c for c in result.columns if c not in df.columns]
        return result, {"columns_encoded": columns, "new_columns": new_columns}

    def _label_encode(self, df, params):
        from sklearn.preprocessing import LabelEncoder

        columns = params["columns"]
        self._require_columns(df, columns)
        result = df.copy()
        mappings = {}
        for col in columns:
            encoder = LabelEncoder()
            non_null_mask = result[col].notna()
            result.loc[non_null_mask, col] = encoder.fit_transform(result.loc[non_null_mask, col].astype(str))
            mappings[col] = {str(v): int(i) for i, v in enumerate(encoder.classes_)}
        return result, {"mappings": mappings}

    def _ordinal_encode(self, df, params):
        columns = params["columns"]
        ordinal_mapping: dict[str, list[str]] = params.get("ordinal_mapping") or {}
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            order = ordinal_mapping.get(col)
            if not order:
                order = sorted(result[col].dropna().unique().tolist(), key=str)
            mapping = {value: idx for idx, value in enumerate(order)}
            result[col] = result[col].map(mapping)
        return result, {"columns_encoded": columns, "orders": ordinal_mapping}

    def _remove_outliers(self, df, params):
        method = OutlierMethod(params.get("method", OutlierMethod.IQR))
        columns = params.get("columns") or df.select_dtypes(include=np.number).columns.tolist()
        self._require_columns(df, columns)
        mask = pd.Series(True, index=df.index)
        if method == OutlierMethod.IQR:
            for col in columns:
                q1, q3 = df[col].quantile(0.25), df[col].quantile(0.75)
                iqr = q3 - q1
                lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                mask &= df[col].between(lower, upper) | df[col].isna()
        else:
            threshold = float(params.get("zscore_threshold", 3.0))
            for col in columns:
                std = df[col].std()
                mean = df[col].mean()
                z = (df[col] - mean) / std if std else pd.Series(0, index=df.index)
                mask &= z.abs().le(threshold) | df[col].isna()
        before = len(df)
        result = df[mask].reset_index(drop=True)
        return result, {"rows_removed": before - len(result), "method": method.value}

    def _feature_scaling(self, df, params):
        # Alias for normalize/standardize combined entry point.
        method = params.get("method", "minmax")
        if method == "zscore":
            return self._standardize(df, params)
        return self._normalize(df, params)

    def _handle_infinite_values(self, df, params):
        strategy = params.get("strategy", "nan")  # nan | drop | clip
        numeric_cols = df.select_dtypes(include=np.number).columns
        inf_mask = np.isinf(df[numeric_cols]).any(axis=1)
        affected = int(inf_mask.sum())
        result = df.copy()
        if strategy == "drop":
            result = result[~inf_mask].reset_index(drop=True)
        elif strategy == "clip":
            for col in numeric_cols:
                finite_vals = result[col].replace([np.inf, -np.inf], np.nan)
                result[col] = result[col].replace(
                    [np.inf, -np.inf], [finite_vals.max(), finite_vals.min()]
                )
        else:
            result[numeric_cols] = result[numeric_cols].replace([np.inf, -np.inf], np.nan)
        return result, {"rows_affected": affected, "strategy": strategy}

    def _remove_empty_rows(self, df, params):
        before = len(df)
        result = df.dropna(how="all").reset_index(drop=True)
        return result, {"rows_removed": before - len(result)}

    def _remove_empty_columns(self, df, params):
        cols_to_drop = [c for c in df.columns if df[c].isna().all()]
        return df.drop(columns=cols_to_drop), {"columns_removed": cols_to_drop}

    def _remove_special_characters(self, df, params):
        columns = params.get("columns") or df.select_dtypes(include="object").columns.tolist()
        pattern = params.get("pattern", r"[^A-Za-z0-9\s]")
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            result[col] = result[col].apply(
                lambda v: re.sub(pattern, "", v) if isinstance(v, str) else v
            )
        return result, {"columns_cleaned": columns}

    def _parse_date_columns(self, df, params):
        columns = params.get("columns")
        if not columns:
            columns = [c for c in df.select_dtypes(include="object").columns
                       if pd.to_datetime(df[c], errors="coerce", format="mixed").notna().mean() > 0.8]
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            result[col] = pd.to_datetime(result[col], errors="coerce", format="mixed")
        return result, {"columns_parsed": columns}

    def _detect_boolean_columns(self, df, params):
        truthy = {"true", "yes", "y", "1"}
        falsy = {"false", "no", "n", "0"}
        result = df.copy()
        detected = []
        for col in df.select_dtypes(include="object").columns:
            values = set(result[col].dropna().astype(str).str.lower().unique())
            if values and values.issubset(truthy | falsy):
                result[col] = result[col].astype(str).str.lower().map(
                    {v: True for v in truthy} | {v: False for v in falsy}
                )
                detected.append(col)
        return result, {"columns_detected": detected}

    def _convert_currency_columns(self, df, params):
        columns = params["columns"]
        self._require_columns(df, columns)
        result = df.copy()
        for col in columns:
            cleaned = result[col].astype(str).str.replace(r"[^\d.\-]", "", regex=True)
            result[col] = pd.to_numeric(cleaned, errors="coerce")
        return result, {"columns_converted": columns}

    def _auto_detect_ids(self, df, params):
        n = len(df) or 1
        id_columns = [
            c for c in df.columns
            if re.search(r"(^id$|_id$|^id_|uuid|guid)", c, re.IGNORECASE)
            or df[c].nunique(dropna=True) / n >= 0.98
        ]
        return df, {"id_columns": id_columns}

    def _auto_detect_target(self, df, params):
        candidates = []
        for col in df.columns:
            nunique = df[col].nunique(dropna=True)
            if 1 < nunique <= 20 or col.lower() in {"target", "label", "class", "outcome", "churn", "y"}:
                candidates.append(col)
        return df, {"candidate_target_columns": candidates}

    _HANDLERS = {
        OperationId.REMOVE_DUPLICATE_ROWS: _remove_duplicate_rows,
        OperationId.REMOVE_DUPLICATE_COLUMNS: _remove_duplicate_columns,
        OperationId.FILL_MISSING: _fill_missing,
        OperationId.DROP_ROWS_WITH_NULLS: _drop_rows_with_nulls,
        OperationId.DROP_COLUMNS_WITH_NULLS: _drop_columns_with_nulls,
        OperationId.TRIM_WHITESPACE: _trim_whitespace,
        OperationId.STANDARDIZE_TEXT: _standardize_text,
        OperationId.RENAME_COLUMNS: _rename_columns,
        OperationId.FIX_DATA_TYPES: _fix_data_types,
        OperationId.REMOVE_CONSTANT_COLUMNS: _remove_constant_columns,
        OperationId.REMOVE_LOW_VARIANCE_COLUMNS: _remove_low_variance_columns,
        OperationId.REMOVE_HIGHLY_CORRELATED: _remove_highly_correlated,
        OperationId.NORMALIZE: _normalize,
        OperationId.STANDARDIZE: _standardize,
        OperationId.ONE_HOT_ENCODE: _one_hot_encode,
        OperationId.LABEL_ENCODE: _label_encode,
        OperationId.ORDINAL_ENCODE: _ordinal_encode,
        OperationId.REMOVE_OUTLIERS: _remove_outliers,
        OperationId.FEATURE_SCALING: _feature_scaling,
        OperationId.HANDLE_INFINITE_VALUES: _handle_infinite_values,
        OperationId.REMOVE_EMPTY_ROWS: _remove_empty_rows,
        OperationId.REMOVE_EMPTY_COLUMNS: _remove_empty_columns,
        OperationId.REMOVE_SPECIAL_CHARACTERS: _remove_special_characters,
        OperationId.PARSE_DATE_COLUMNS: _parse_date_columns,
        OperationId.DETECT_BOOLEAN_COLUMNS: _detect_boolean_columns,
        OperationId.CONVERT_CURRENCY_COLUMNS: _convert_currency_columns,
        OperationId.AUTO_DETECT_IDS: _auto_detect_ids,
        OperationId.AUTO_DETECT_TARGET: _auto_detect_target,
    }


# --------------------------------------------------------------------------- #
# Feature engineering
# --------------------------------------------------------------------------- #

class FeatureEngineer:

    def suggest(self, df: pd.DataFrame) -> list[FeatureEngineeringSuggestion]:
        suggestions = []
        datetime_cols = df.select_dtypes(include="datetime64[ns]").columns.tolist()
        numeric_cols = df.select_dtypes(include=np.number).columns.tolist()

        if datetime_cols:
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.DATE_FEATURES,
                title="Extract Date Features",
                description="Derive year, month, day, quarter, week, day-of-week and weekend flags.",
                applicable_columns=datetime_cols,
            ))
        dob_candidates = [c for c in df.columns if re.search(r"dob|birth", c, re.IGNORECASE)]
        if dob_candidates:
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.AGE_CALCULATION,
                title="Calculate Age",
                description="Compute age from a date-of-birth column.",
                applicable_columns=dob_candidates,
            ))
        weight_cols = [c for c in df.columns if re.search(r"weight", c, re.IGNORECASE)]
        height_cols = [c for c in df.columns if re.search(r"height", c, re.IGNORECASE)]
        if weight_cols and height_cols:
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.BMI,
                title="Calculate BMI",
                description="Derive BMI from weight (kg) and height (m) columns.",
                applicable_columns=weight_cols + height_cols,
            ))
        income_cols = [c for c in df.columns if re.search(r"income|salary", c, re.IGNORECASE)]
        if income_cols:
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.INCOME_GROUPS,
                title="Create Income Groups",
                description="Bucket a numeric income/salary column into groups.",
                applicable_columns=income_cols,
            ))
        if len(numeric_cols) >= 2:
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.INTERACTION_FEATURES,
                title="Create Interaction Features",
                description="Combine two numeric columns (e.g. multiply, ratio) into a new feature.",
                applicable_columns=numeric_cols,
            ))
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.RATIO_FEATURES,
                title="Create Ratio Features",
                description="Compute a ratio between two numeric columns.",
                applicable_columns=numeric_cols,
            ))
        skewed = [c for c in numeric_cols if df[c].dropna().gt(0).all() and df[c].skew() > 1]
        if skewed:
            suggestions.append(FeatureEngineeringSuggestion(
                id=FeatureEngineeringId.LOG_TRANSFORM,
                title="Apply Log Transform",
                description="Reduce right-skew on positively-valued numeric columns.",
                applicable_columns=skewed,
            ))
        return suggestions

    def apply(self, df: pd.DataFrame, op: FeatureEngineeringOperation) -> tuple[pd.DataFrame, list[str]]:
        handler = self._HANDLERS.get(op.id)
        if handler is None:
            raise InvalidOperationError(f"Unknown feature engineering operation '{op.id}'.")
        return handler(self, df, op.params)

    @staticmethod
    def _require_columns(df: pd.DataFrame, columns: list[str]) -> None:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise ColumnNotFoundError(f"Columns not found: {', '.join(missing)}")

    def _date_features(self, df, params):
        column = params["column"]
        parts = params.get("parts") or ["year", "month", "day"]
        self._require_columns(df, [column])
        result = df.copy()
        series = pd.to_datetime(result[column], errors="coerce", format="mixed")
        created = []
        part_map = {
            "year": series.dt.year, "month": series.dt.month, "day": series.dt.day,
            "quarter": series.dt.quarter, "week": series.dt.isocalendar().week,
            "day_of_week": series.dt.dayofweek, "is_weekend": series.dt.dayofweek >= 5,
        }
        for part in parts:
            key = part.value if hasattr(part, "value") else part
            if key in part_map:
                col_name = f"{column}_{key}"
                result[col_name] = part_map[key]
                created.append(col_name)
        return result, created

    def _age_calculation(self, df, params):
        dob_col = params["dob_column"]
        output_col = params.get("output_column", "age")
        reference = pd.to_datetime(params.get("reference_date")) if params.get("reference_date") else pd.Timestamp.now()
        self._require_columns(df, [dob_col])
        result = df.copy()
        dob = pd.to_datetime(result[dob_col], errors="coerce", format="mixed")
        result[output_col] = ((reference - dob).dt.days // 365).astype("Int64")
        return result, [output_col]

    def _bmi(self, df, params):
        weight_col, height_col = params["weight_kg_column"], params["height_m_column"]
        output_col = params.get("output_column", "bmi")
        self._require_columns(df, [weight_col, height_col])
        result = df.copy()
        result[output_col] = result[weight_col] / (result[height_col] ** 2)
        return result, [output_col]

    def _income_groups(self, df, params):
        column, bins, labels = params["column"], params["bins"], params["labels"]
        output_col = params.get("output_column", "income_group")
        self._require_columns(df, [column])
        result = df.copy()
        result[output_col] = pd.cut(result[column], bins=bins, labels=labels, include_lowest=True)
        return result, [output_col]

    def _binning(self, df, params):
        column, bins = params["column"], params.get("bins", 5)
        labels = params.get("labels")
        output_col = params.get("output_column", f"{column}_bin")
        self._require_columns(df, [column])
        result = df.copy()
        result[output_col] = pd.cut(result[column], bins=bins, labels=labels)
        return result, [output_col]

    def _interaction_features(self, df, params):
        col_a, col_b = params["column_a"], params["column_b"]
        operation = params.get("operation", "multiply")
        output_col = params.get("output_column") or f"{col_a}_{operation}_{col_b}"
        self._require_columns(df, [col_a, col_b])
        result = df.copy()
        ops = {
            "multiply": lambda a, b: a * b, "add": lambda a, b: a + b,
            "subtract": lambda a, b: a - b, "divide": lambda a, b: a / b.replace(0, np.nan),
        }
        result[output_col] = ops[operation](result[col_a], result[col_b])
        return result, [output_col]

    def _polynomial_features(self, df, params):
        from sklearn.preprocessing import PolynomialFeatures

        columns, degree = params["columns"], params.get("degree", 2)
        self._require_columns(df, columns)
        result = df.copy()
        poly = PolynomialFeatures(degree=degree, include_bias=False)
        transformed = poly.fit_transform(result[columns].fillna(0))
        feature_names = poly.get_feature_names_out(columns)
        new_cols = [n for n in feature_names if n not in columns]
        poly_df = pd.DataFrame(transformed, columns=feature_names, index=result.index)
        for col in new_cols:
            result[col] = poly_df[col]
        return result, new_cols

    def _log_transform(self, df, params):
        columns = params["columns"]
        self._require_columns(df, columns)
        result = df.copy()
        created = []
        for col in columns:
            out_col = f"{col}_log"
            result[out_col] = np.log1p(result[col].clip(lower=0))
            created.append(out_col)
        return result, created

    def _sqrt_transform(self, df, params):
        columns = params["columns"]
        self._require_columns(df, columns)
        result = df.copy()
        created = []
        for col in columns:
            out_col = f"{col}_sqrt"
            result[out_col] = np.sqrt(result[col].clip(lower=0))
            created.append(out_col)
        return result, created

    def _ratio_features(self, df, params):
        numerator, denominator = params["numerator_column"], params["denominator_column"]
        output_col = params.get("output_column") or f"{numerator}_to_{denominator}_ratio"
        self._require_columns(df, [numerator, denominator])
        result = df.copy()
        result[output_col] = result[numerator] / result[denominator].replace(0, np.nan)
        return result, [output_col]

    def _aggregated_features(self, df, params):
        group_by, agg_col = params["group_by"], params["agg_column"]
        agg_func = params.get("agg_func", "mean")
        output_col = params.get("output_column") or f"{agg_col}_{agg_func}_by_{'_'.join(group_by)}"
        self._require_columns(df, group_by + [agg_col])
        result = df.copy()
        result[output_col] = result.groupby(group_by)[agg_col].transform(agg_func)
        return result, [output_col]

    def _rolling_statistics(self, df, params):
        column, window = params["column"], params.get("window", 3)
        stat = params.get("stat", "mean")
        output_col = f"{column}_rolling_{stat}_{window}"
        self._require_columns(df, [column])
        result = df.copy()
        rolling = result[column].rolling(window=window, min_periods=1)
        result[output_col] = getattr(rolling, stat)()
        return result, [output_col]

    def _lag_features(self, df, params):
        column, periods = params["column"], params.get("periods", 1)
        output_col = f"{column}_lag_{periods}"
        self._require_columns(df, [column])
        result = df.copy()
        result[output_col] = result[column].shift(periods)
        return result, [output_col]

    def _custom_formula(self, df, params):
        output_col, formula = params["output_column"], params["formula"]
        result = df.copy()
        try:
            result[output_col] = result.eval(formula)
        except Exception as exc:  # noqa: BLE001
            raise DataCleaningError(f"Invalid formula '{formula}': {exc}") from exc
        return result, [output_col]

    _HANDLERS = {
        FeatureEngineeringId.DATE_FEATURES: _date_features,
        FeatureEngineeringId.AGE_CALCULATION: _age_calculation,
        FeatureEngineeringId.BMI: _bmi,
        FeatureEngineeringId.INCOME_GROUPS: _income_groups,
        FeatureEngineeringId.BINNING: _binning,
        FeatureEngineeringId.INTERACTION_FEATURES: _interaction_features,
        FeatureEngineeringId.POLYNOMIAL_FEATURES: _polynomial_features,
        FeatureEngineeringId.LOG_TRANSFORM: _log_transform,
        FeatureEngineeringId.SQRT_TRANSFORM: _sqrt_transform,
        FeatureEngineeringId.RATIO_FEATURES: _ratio_features,
        FeatureEngineeringId.AGGREGATED_FEATURES: _aggregated_features,
        FeatureEngineeringId.ROLLING_STATISTICS: _rolling_statistics,
        FeatureEngineeringId.LAG_FEATURES: _lag_features,
        FeatureEngineeringId.CUSTOM_FORMULA: _custom_formula,
    }


# --------------------------------------------------------------------------- #
# Feature extraction / selection
# --------------------------------------------------------------------------- #

class FeatureExtractor:

    def extract(
        self, df: pd.DataFrame, method: FeatureExtractionMethod,
        target_column: Optional[str], n_features: Optional[int], variance_threshold: float,
    ) -> tuple[list[str], list[FeatureImportance]]:
        numeric_df = df.select_dtypes(include=np.number).dropna(axis=1, how="all").fillna(0)
        if numeric_df.empty:
            raise DataCleaningError("No numeric columns available for feature extraction.")

        supervised_methods = {
            FeatureExtractionMethod.SELECT_K_BEST, FeatureExtractionMethod.MUTUAL_INFO,
            FeatureExtractionMethod.RFE, FeatureExtractionMethod.CHI_SQUARE,
            FeatureExtractionMethod.ANOVA, FeatureExtractionMethod.TREE_IMPORTANCE,
            FeatureExtractionMethod.RANDOM_FOREST_IMPORTANCE, FeatureExtractionMethod.XGBOOST_IMPORTANCE,
            FeatureExtractionMethod.LASSO,
        }
        if method in supervised_methods:
            if not target_column or target_column not in df.columns:
                raise InvalidOperationError(f"'{method.value}' requires a valid target_column.")
            if target_column in numeric_df.columns:
                numeric_df = numeric_df.drop(columns=[target_column])
            y = df[target_column]
            X = numeric_df
        else:
            X, y = numeric_df, None

        handler = self._HANDLERS[method]
        return handler(self, X, y, n_features, variance_threshold)

    def _pca(self, X, y, n_features, variance_threshold):
        from sklearn.decomposition import PCA
        from sklearn.preprocessing import StandardScaler

        n_components = n_features or min(X.shape[1], X.shape[0], 10)
        scaled = StandardScaler().fit_transform(X)
        pca = PCA(n_components=n_components)
        pca.fit(scaled)
        components = [f"pc_{i + 1}" for i in range(n_components)]
        importances = [
            FeatureImportance(feature=comp, score=round(float(ratio), 6))
            for comp, ratio in zip(components, pca.explained_variance_ratio_)
        ]
        return components, importances

    def _select_k_best(self, X, y, n_features, variance_threshold):
        from sklearn.feature_selection import SelectKBest, f_classif

        k = n_features or min(10, X.shape[1])
        selector = SelectKBest(score_func=f_classif, k=k)
        selector.fit(X, y)
        scores = np.nan_to_num(selector.scores_)
        return self._rank(X.columns, scores, k)

    def _variance_threshold(self, X, y, n_features, variance_threshold):
        from sklearn.feature_selection import VarianceThreshold

        selector = VarianceThreshold(threshold=variance_threshold)
        selector.fit(X)
        mask = selector.get_support()
        selected = X.columns[mask].tolist()
        importances = [FeatureImportance(feature=c, score=round(float(X[c].var()), 6)) for c in selected]
        return selected, importances

    def _mutual_info(self, X, y, n_features, variance_threshold):
        from sklearn.feature_selection import mutual_info_classif

        scores = mutual_info_classif(X, y, random_state=42)
        k = n_features or min(10, X.shape[1])
        return self._rank(X.columns, scores, k)

    def _rfe(self, X, y, n_features, variance_threshold):
        from sklearn.feature_selection import RFE
        from sklearn.linear_model import LogisticRegression

        k = n_features or max(1, X.shape[1] // 2)
        estimator = LogisticRegression(max_iter=1000)
        selector = RFE(estimator, n_features_to_select=k)
        selector.fit(X, y)
        selected = X.columns[selector.support_].tolist()
        importances = [
            FeatureImportance(feature=c, score=round(1.0 / rank, 4))
            for c, rank in zip(X.columns, selector.ranking_) if c in selected
        ]
        return selected, importances

    def _chi_square(self, X, y, n_features, variance_threshold):
        from sklearn.feature_selection import SelectKBest, chi2
        from sklearn.preprocessing import MinMaxScaler

        k = n_features or min(10, X.shape[1])
        X_scaled = MinMaxScaler().fit_transform(X)
        selector = SelectKBest(score_func=chi2, k=k)
        selector.fit(X_scaled, y)
        scores = np.nan_to_num(selector.scores_)
        return self._rank(X.columns, scores, k)

    def _anova(self, X, y, n_features, variance_threshold):
        return self._select_k_best(X, y, n_features, variance_threshold)

    def _tree_importance(self, X, y, n_features, variance_threshold):
        from sklearn.tree import DecisionTreeClassifier

        model = DecisionTreeClassifier(random_state=42)
        model.fit(X, y)
        k = n_features or min(10, X.shape[1])
        return self._rank(X.columns, model.feature_importances_, k)

    def _random_forest_importance(self, X, y, n_features, variance_threshold):
        from sklearn.ensemble import RandomForestClassifier

        model = RandomForestClassifier(n_estimators=200, random_state=42)
        model.fit(X, y)
        k = n_features or min(10, X.shape[1])
        return self._rank(X.columns, model.feature_importances_, k)

    def _xgboost_importance(self, X, y, n_features, variance_threshold):
        try:
            from xgboost import XGBClassifier
        except ImportError as exc:
            raise DataCleaningError(
                "xgboost is not installed. Add 'xgboost' to requirements.txt to use this method."
            ) from exc

        model = XGBClassifier(eval_metric="logloss", use_label_encoder=False)
        model.fit(X, y)
        k = n_features or min(10, X.shape[1])
        return self._rank(X.columns, model.feature_importances_, k)

    def _lasso(self, X, y, n_features, variance_threshold):
        from sklearn.linear_model import LassoCV

        model = LassoCV(cv=5, random_state=42)
        model.fit(X, y)
        k = n_features or min(10, X.shape[1])
        return self._rank(X.columns, np.abs(model.coef_), k)

    @staticmethod
    def _rank(columns, scores, k) -> tuple[list[str], list[FeatureImportance]]:
        ranked = sorted(zip(columns, scores), key=lambda pair: pair[1], reverse=True)
        top = ranked[:k]
        selected = [name for name, _ in top]
        importances = [FeatureImportance(feature=name, score=round(float(score), 6)) for name, score in top]
        return selected, importances

    _HANDLERS = {
        FeatureExtractionMethod.PCA: _pca,
        FeatureExtractionMethod.SELECT_K_BEST: _select_k_best,
        FeatureExtractionMethod.VARIANCE_THRESHOLD: _variance_threshold,
        FeatureExtractionMethod.MUTUAL_INFO: _mutual_info,
        FeatureExtractionMethod.RFE: _rfe,
        FeatureExtractionMethod.CHI_SQUARE: _chi_square,
        FeatureExtractionMethod.ANOVA: _anova,
        FeatureExtractionMethod.TREE_IMPORTANCE: _tree_importance,
        FeatureExtractionMethod.RANDOM_FOREST_IMPORTANCE: _random_forest_importance,
        FeatureExtractionMethod.XGBOOST_IMPORTANCE: _xgboost_importance,
        FeatureExtractionMethod.LASSO: _lasso,
    }


# --------------------------------------------------------------------------- #
# Facade service used by the API layer
# --------------------------------------------------------------------------- #

class DataCleaningService:
    """Public facade orchestrating the full data cleaning workflow."""

    def __init__(self, output_dir: str = "storage/datacleaning_outputs") -> None:
        self._sessions = SessionStore()
        self._loader = DatasetLoader()
        self._analyzer = DatasetAnalyzer()
        self._cleaner = DataCleaner()
        self._engineer = FeatureEngineer()
        self._extractor = FeatureExtractor()
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

    # -- upload & analysis ------------------------------------------------ #

    def ingest_and_analyze(self, filename: str, content: bytes) -> tuple[str, str, AnalysisReport, list[Recommendation]]:
        df = self._loader.load(filename, content)
        session = self._sessions.create(df, filename)
        report = self._analyzer.analyze(df)
        recommendations = self._analyzer.recommend(report)
        logger.info("Session %s created for '%s' (%s rows, %s cols)",
                    session.session_id, filename, len(df), df.shape[1])
        return session.session_id, filename, report, recommendations

    def reanalyze(self, session_id: str) -> AnalysisReport:
        session = self._sessions.get(session_id)
        return self._analyzer.analyze(session.df)

    def preview(self, session_id: str, rows: int = 20) -> tuple[list[str], list[dict[str, Any]], int]:
        session = self._sessions.get(session_id)
        sample = session.df.head(rows).replace({np.nan: None})
        return session.df.columns.tolist(), sample.to_dict(orient="records"), len(session.df)

    # -- cleaning ----------------------------------------------------------- #

    def apply_cleaning(self, session_id: str, operations: list[CleaningOperation]) -> tuple[list[CleaningResultItem], AnalysisReport]:
        session = self._sessions.get(session_id)
        df = session.df
        results: list[CleaningResultItem] = []
        rows_before, missing_before = len(df), int(df.isna().sum().sum())

        for op in operations:
            try:
                df, details = self._cleaner.apply(df, op)
                session.operations_applied.append(op.id.value)
                if op.id.value == "rename_columns":
                    session.columns_renamed.update(details.get("renamed", {}))
                results.append(CleaningResultItem(
                    id=op.id, success=True,
                    message=f"'{op.id.value}' applied successfully.", details=details,
                ))
            except DataCleaningError as exc:
                logger.warning("Cleaning operation '%s' failed for session %s: %s", op.id, session_id, exc)
                results.append(CleaningResultItem(id=op.id, success=False, message=str(exc)))

        session.duplicates_removed += max(0, rows_before - len(df)) if any(
            r.id == OperationId.REMOVE_DUPLICATE_ROWS and r.success for r in results
        ) else 0
        session.missing_values_removed += max(0, missing_before - int(df.isna().sum().sum()))
        self._sessions.update_dataframe(session_id, df)
        return results, self._analyzer.analyze(df)

    # -- feature engineering ------------------------------------------------ #

    def suggest_feature_engineering(self, session_id: str) -> list[FeatureEngineeringSuggestion]:
        session = self._sessions.get(session_id)
        return self._engineer.suggest(session.df)

    def apply_feature_engineering(
        self, session_id: str, operations: list[FeatureEngineeringOperation]
    ) -> tuple[list[FeatureEngineeringResultItem], list[str]]:
        session = self._sessions.get(session_id)
        df = session.df
        results = []
        for op in operations:
            try:
                df, created_cols = self._engineer.apply(df, op)
                session.operations_applied.append(f"feature_engineering:{op.id.value}")
                session.features_created.extend(created_cols)
                results.append(FeatureEngineeringResultItem(
                    id=op.id, success=True,
                    message=f"'{op.id.value}' applied successfully.", columns_created=created_cols,
                ))
            except DataCleaningError as exc:
                logger.warning("Feature engineering '%s' failed for session %s: %s", op.id, session_id, exc)
                results.append(FeatureEngineeringResultItem(id=op.id, success=False, message=str(exc)))
        self._sessions.update_dataframe(session_id, df)
        return results, df.columns.tolist()

    # -- feature extraction -------------------------------------------------- #

    def apply_feature_extraction(
        self, session_id: str, method: FeatureExtractionMethod,
        target_column: Optional[str], n_features: Optional[int], variance_threshold: float,
    ) -> tuple[list[str], list[FeatureImportance]]:
        session = self._sessions.get(session_id)
        selected, importances = self._extractor.extract(
            session.df, method, target_column, n_features, variance_threshold
        )
        session.feature_importance = importances
        return selected, importances

    def apply_feature_selection(self, session_id: str, keep_columns: list[str]) -> None:
        """Drop the dataset down to the selected feature set (plus target, if present)."""
        session = self._sessions.get(session_id)
        removed = [c for c in session.df.columns if c not in keep_columns]
        session.features_removed.extend(removed)
        self._sessions.update_dataframe(session_id, session.df[keep_columns])

    # -- finalize & download -------------------------------------------------- #

    def finalize(self, session_id: str, start_time: float, file_format: str = "csv") -> CleaningReport:
        session = self._sessions.get(session_id)
        df = session.df
        output_path = self._output_dir / f"{session_id}.{file_format}"
        if file_format == "csv":
            df.to_csv(output_path, index=False)
        elif file_format in ("xlsx",):
            df.to_excel(output_path, index=False, engine="openpyxl")
        elif file_format == "json":
            df.to_json(output_path, orient="records")
        else:
            raise UnsupportedFileTypeError(f"Unsupported export format '{file_format}'.")

        return CleaningReport(
            session_id=session_id,
            rows_before=session.original_row_count,
            rows_after=len(df),
            columns_before=session.original_column_count,
            columns_after=df.shape[1],
            operations_applied=session.operations_applied,
            execution_time_seconds=round(time.time() - start_time, 4),
            missing_values_removed=session.missing_values_removed,
            duplicates_removed=session.duplicates_removed,
            columns_renamed=session.columns_renamed,
            features_created=session.features_created,
            features_removed=session.features_removed,
            feature_importance=session.feature_importance,
            download_url=f"/api/v1/datacleaning/{session_id}/download?format={file_format}",
        )

    def get_output_path(self, session_id: str, file_format: str = "csv") -> Path:
        path = self._output_dir / f"{session_id}.{file_format}"
        if not path.exists():
            raise DataCleaningError(
                f"No exported file found for session '{session_id}' in format '{file_format}'. "
                f"Call /finalize first."
            )
        return path

    def delete_session(self, session_id: str) -> None:
        self._sessions.delete(session_id)
        for fmt in ("csv", "xlsx", "json"):
            path = self._output_dir / f"{session_id}.{fmt}"
            if path.exists():
                path.unlink()


# Module-level singleton, imported by the API layer (mirrors the pattern used
# by the other services in this codebase, e.g. chat_service / document_service).
data_cleaning_service = DataCleaningService()