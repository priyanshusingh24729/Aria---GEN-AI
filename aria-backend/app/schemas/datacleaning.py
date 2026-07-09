"""
Pydantic v2 schemas for the AI-powered Data Cleaning module.

These models define every request/response contract used across the
upload -> analyze -> clean -> feature-engineer -> feature-extract -> report
workflow.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #

class SupportedFileType(str, Enum):
    CSV = "csv"
    XLSX = "xlsx"
    XLS = "xls"
    JSON = "json"


class MissingValueStrategy(str, Enum):
    MEAN = "mean"
    MEDIAN = "median"
    MODE = "mode"
    CONSTANT = "constant"
    FORWARD_FILL = "forward_fill"
    BACKWARD_FILL = "backward_fill"


class OutlierMethod(str, Enum):
    IQR = "iqr"
    ZSCORE = "zscore"


class TargetTypeCast(str, Enum):
    NUMERIC = "numeric"
    DATETIME = "datetime"
    CATEGORY = "category"


class FeatureExtractionMethod(str, Enum):
    PCA = "pca"
    SELECT_K_BEST = "select_k_best"
    VARIANCE_THRESHOLD = "variance_threshold"
    MUTUAL_INFO = "mutual_info"
    RFE = "rfe"
    CHI_SQUARE = "chi_square"
    ANOVA = "anova"
    TREE_IMPORTANCE = "tree_importance"
    RANDOM_FOREST_IMPORTANCE = "random_forest_importance"
    XGBOOST_IMPORTANCE = "xgboost_importance"
    LASSO = "lasso"


class DateFeaturePart(str, Enum):
    YEAR = "year"
    MONTH = "month"
    DAY = "day"
    QUARTER = "quarter"
    WEEK = "week"
    DAY_OF_WEEK = "day_of_week"
    IS_WEEKEND = "is_weekend"


class OperationId(str, Enum):
    REMOVE_DUPLICATE_ROWS = "remove_duplicate_rows"
    REMOVE_DUPLICATE_COLUMNS = "remove_duplicate_columns"
    FILL_MISSING = "fill_missing"
    DROP_ROWS_WITH_NULLS = "drop_rows_with_nulls"
    DROP_COLUMNS_WITH_NULLS = "drop_columns_with_nulls"
    TRIM_WHITESPACE = "trim_whitespace"
    STANDARDIZE_TEXT = "standardize_text"
    RENAME_COLUMNS = "rename_columns"
    FIX_DATA_TYPES = "fix_data_types"
    REMOVE_CONSTANT_COLUMNS = "remove_constant_columns"
    REMOVE_LOW_VARIANCE_COLUMNS = "remove_low_variance_columns"
    REMOVE_HIGHLY_CORRELATED = "remove_highly_correlated"
    NORMALIZE = "normalize"
    STANDARDIZE = "standardize"
    ONE_HOT_ENCODE = "one_hot_encode"
    LABEL_ENCODE = "label_encode"
    ORDINAL_ENCODE = "ordinal_encode"
    REMOVE_OUTLIERS = "remove_outliers"
    FEATURE_SCALING = "feature_scaling"
    HANDLE_INFINITE_VALUES = "handle_infinite_values"
    REMOVE_EMPTY_ROWS = "remove_empty_rows"
    REMOVE_EMPTY_COLUMNS = "remove_empty_columns"
    REMOVE_SPECIAL_CHARACTERS = "remove_special_characters"
    PARSE_DATE_COLUMNS = "parse_date_columns"
    DETECT_BOOLEAN_COLUMNS = "detect_boolean_columns"
    CONVERT_CURRENCY_COLUMNS = "convert_currency_columns"
    AUTO_DETECT_IDS = "auto_detect_ids"
    AUTO_DETECT_TARGET = "auto_detect_target"


class FeatureEngineeringId(str, Enum):
    DATE_FEATURES = "date_features"
    AGE_CALCULATION = "age_calculation"
    BMI = "bmi"
    INCOME_GROUPS = "income_groups"
    BINNING = "binning"
    INTERACTION_FEATURES = "interaction_features"
    POLYNOMIAL_FEATURES = "polynomial_features"
    LOG_TRANSFORM = "log_transform"
    SQRT_TRANSFORM = "sqrt_transform"
    RATIO_FEATURES = "ratio_features"
    AGGREGATED_FEATURES = "aggregated_features"
    ROLLING_STATISTICS = "rolling_statistics"
    LAG_FEATURES = "lag_features"
    CUSTOM_FORMULA = "custom_formula"


# --------------------------------------------------------------------------- #
# Analysis report models
# --------------------------------------------------------------------------- #

class DatasetOverview(BaseModel):
    rows: int
    columns: int
    memory_usage_bytes: int
    memory_usage_human: str
    dtypes: dict[str, str]


class MissingValueColumn(BaseModel):
    column: str
    missing_count: int
    missing_percentage: float


class MissingValuesReport(BaseModel):
    total_missing: int
    columns_affected: list[MissingValueColumn]


class DuplicateReport(BaseModel):
    duplicate_row_count: int
    duplicate_column_count: int
    duplicate_column_names: list[str]


class InvalidDataTypeIssue(BaseModel):
    column: str
    current_dtype: str
    suspected_dtype: str
    reason: str


class ColumnGroups(BaseModel):
    categorical: list[str]
    numerical: list[str]
    datetime: list[str]
    boolean: list[str]


class UniqueValueInfo(BaseModel):
    column: str
    unique_count: int
    unique_ratio: float


class ConstantColumnInfo(BaseModel):
    column: str
    constant_value: Any


class WhitespaceIssue(BaseModel):
    column: str
    affected_rows: int


class MixedCaseIssue(BaseModel):
    column: str
    example_variants: list[str]


class OutlierColumnInfo(BaseModel):
    column: str
    outlier_count: int
    lower_bound: float
    upper_bound: float


class CorrelatedPair(BaseModel):
    column_a: str
    column_b: str
    correlation: float


class LowVarianceColumn(BaseModel):
    column: str
    variance: float


class Recommendation(BaseModel):
    id: OperationId
    title: str
    description: str


class AnalysisReport(BaseModel):
    overview: DatasetOverview
    missing_values: MissingValuesReport
    duplicates: DuplicateReport
    invalid_data_types: list[InvalidDataTypeIssue]
    column_groups: ColumnGroups
    unique_values: list[UniqueValueInfo]
    null_columns: list[str]
    constant_columns: list[ConstantColumnInfo]
    whitespace_issues: list[WhitespaceIssue]
    mixed_case_issues: list[MixedCaseIssue]
    outliers: list[OutlierColumnInfo]
    highly_correlated_features: list[CorrelatedPair]
    low_variance_columns: list[LowVarianceColumn]
    potential_target_columns: list[str]
    potential_id_columns: list[str]


class UploadAnalysisResponse(BaseModel):
    session_id: str
    filename: str
    analysis: AnalysisReport
    recommended_operations: list[Recommendation]


class PreviewResponse(BaseModel):
    session_id: str
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int


# --------------------------------------------------------------------------- #
# Cleaning operation request models
# --------------------------------------------------------------------------- #

class CleaningOperation(BaseModel):
    """A single cleaning operation selected by the user, with its params."""

    model_config = ConfigDict(extra="forbid")

    id: OperationId
    params: dict[str, Any] = Field(default_factory=dict)


class CleaningRequest(BaseModel):
    operations: list[CleaningOperation] = Field(..., min_length=1)


class CleaningResultItem(BaseModel):
    id: OperationId
    success: bool
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class CleaningResponse(BaseModel):
    session_id: str
    results: list[CleaningResultItem]
    analysis: AnalysisReport


# --------------------------------------------------------------------------- #
# Feature engineering models
# --------------------------------------------------------------------------- #

class FeatureEngineeringOperation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: FeatureEngineeringId
    params: dict[str, Any] = Field(default_factory=dict)


class FeatureEngineeringRequest(BaseModel):
    operations: list[FeatureEngineeringOperation] = Field(..., min_length=1)


class FeatureEngineeringSuggestion(BaseModel):
    id: FeatureEngineeringId
    title: str
    description: str
    applicable_columns: list[str]


class FeatureEngineeringSuggestionsResponse(BaseModel):
    session_id: str
    suggestions: list[FeatureEngineeringSuggestion]


class FeatureEngineeringResultItem(BaseModel):
    id: FeatureEngineeringId
    success: bool
    message: str
    columns_created: list[str] = Field(default_factory=list)


class FeatureEngineeringResponse(BaseModel):
    session_id: str
    results: list[FeatureEngineeringResultItem]
    columns: list[str]


# --------------------------------------------------------------------------- #
# Feature extraction models
# --------------------------------------------------------------------------- #

class FeatureExtractionRequest(BaseModel):
    method: FeatureExtractionMethod
    target_column: Optional[str] = None
    n_features: Optional[int] = None
    variance_threshold: float = 0.0


class FeatureImportance(BaseModel):
    feature: str
    score: float


class FeatureExtractionResponse(BaseModel):
    session_id: str
    method: FeatureExtractionMethod
    selected_features: list[str]
    feature_importances: list[FeatureImportance]


# --------------------------------------------------------------------------- #
# Final report models
# --------------------------------------------------------------------------- #

class CleaningReport(BaseModel):
    session_id: str
    rows_before: int
    rows_after: int
    columns_before: int
    columns_after: int
    operations_applied: list[str]
    execution_time_seconds: float
    missing_values_removed: int
    duplicates_removed: int
    columns_renamed: dict[str, str]
    features_created: list[str]
    features_removed: list[str]
    feature_importance: list[FeatureImportance]
    download_url: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    detail: str