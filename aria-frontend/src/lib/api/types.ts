// export interface ChatMessage {
//   role: "user" | "assistant";
//   content: string;
// }

// export interface RagSource {
//   content: string;
//   source_file: string;
//   page: number | null;
// }

// export interface DocMessage extends ChatMessage {
//   sources?: RagSource[];
// }

// export interface DocStatus {
//   ready: boolean;
//   num_chunks: number;
//   doc_names: string[];
// }

// export interface ImageItem {
//   prompt: string;
//   url: string | null;
//   filepath: string | null;
// }

// export interface SqlSession {
//   sessionId: string;
//   tables: string[];
//   schemaText: string;
//   sourceName: string;
// }

// /* -----------------------------------------
//  * SQL Chart Types
//  * ----------------------------------------- */

// export type ChartType =
//   | "bar"
//   | "line"
//   | "pie"
//   | "scatter";

// export interface ChartConfig {
//   type: ChartType;

//   title: string;

//   // Used for Bar / Line / Scatter
//   xKey?: string;
//   yKey?: string;

//   // Used for Pie
//   nameKey?: string;
//   valueKey?: string;

//   data: Record<string, unknown>[];
// }

// /* -----------------------------------------
//  * SQL Chat Exchange
//  * ----------------------------------------- */

// export interface SqlExchange {
//   question: string;

//   sql?: string;

//   rows?: Record<string, unknown>[];

//   rowCount?: number;

//   chart?: ChartConfig;

//   explanation?: string;

//   cannotAnswerReason?: string;

//   error?: string;

//   streaming: boolean;
// }


// // ---------------------------------------------------------------------------
// // TypeScript types for the AI-powered Data Cleaning module.
// // Mirrors app/schemas/datacleaning.py field-for-field. No `any`.
// // ---------------------------------------------------------------------------

// // --------------------------------- Enums ---------------------------------

// export type SupportedFileType = "csv" | "xlsx" | "xls" | "json";

// export type MissingValueStrategy =
//   | "mean"
//   | "median"
//   | "mode"
//   | "constant"
//   | "forward_fill"
//   | "backward_fill";

// export type OutlierMethod = "iqr" | "zscore";

// export type TargetTypeCast = "numeric" | "datetime" | "category";

// export type FeatureExtractionMethod =
//   | "pca"
//   | "select_k_best"
//   | "variance_threshold"
//   | "mutual_info"
//   | "rfe"
//   | "chi_square"
//   | "anova"
//   | "tree_importance"
//   | "random_forest_importance"
//   | "xgboost_importance"
//   | "lasso";

// export type DateFeaturePart =
//   | "year"
//   | "month"
//   | "day"
//   | "quarter"
//   | "week"
//   | "day_of_week"
//   | "is_weekend";

// export type OperationId =
//   | "remove_duplicate_rows"
//   | "remove_duplicate_columns"
//   | "fill_missing"
//   | "drop_rows_with_nulls"
//   | "drop_columns_with_nulls"
//   | "trim_whitespace"
//   | "standardize_text"
//   | "rename_columns"
//   | "fix_data_types"
//   | "remove_constant_columns"
//   | "remove_low_variance_columns"
//   | "remove_highly_correlated"
//   | "normalize"
//   | "standardize"
//   | "one_hot_encode"
//   | "label_encode"
//   | "ordinal_encode"
//   | "remove_outliers"
//   | "feature_scaling"
//   | "handle_infinite_values"
//   | "remove_empty_rows"
//   | "remove_empty_columns"
//   | "remove_special_characters"
//   | "parse_date_columns"
//   | "detect_boolean_columns"
//   | "convert_currency_columns"
//   | "auto_detect_ids"
//   | "auto_detect_target";

// export type FeatureEngineeringId =
//   | "date_features"
//   | "age_calculation"
//   | "bmi"
//   | "income_groups"
//   | "binning"
//   | "interaction_features"
//   | "polynomial_features"
//   | "log_transform"
//   | "sqrt_transform"
//   | "ratio_features"
//   | "aggregated_features"
//   | "rolling_statistics"
//   | "lag_features"
//   | "custom_formula";

// // A cell value coming back from a JSON dataset preview. Pandas can emit
// // strings, numbers, booleans, or null (NaN is normalized to null server-side).
// export type CellValue = string | number | boolean | null;

// // ------------------------------ Analysis report ---------------------------

// export interface DatasetOverview {
//   rows: number;
//   columns: number;
//   memory_usage_bytes: number;
//   memory_usage_human: string;
//   dtypes: Record<string, string>;
// }

// export interface MissingValueColumn {
//   column: string;
//   missing_count: number;
//   missing_percentage: number;
// }

// export interface MissingValuesReport {
//   total_missing: number;
//   columns_affected: MissingValueColumn[];
// }

// export interface DuplicateReport {
//   duplicate_row_count: number;
//   duplicate_column_count: number;
//   duplicate_column_names: string[];
// }

// export interface InvalidDataTypeIssue {
//   column: string;
//   current_dtype: string;
//   suspected_dtype: string;
//   reason: string;
// }

// export interface ColumnGroups {
//   categorical: string[];
//   numerical: string[];
//   datetime: string[];
//   boolean: string[];
// }

// export interface UniqueValueInfo {
//   column: string;
//   unique_count: number;
//   unique_ratio: number;
// }

// export interface ConstantColumnInfo {
//   column: string;
//   constant_value: CellValue;
// }

// export interface WhitespaceIssue {
//   column: string;
//   affected_rows: number;
// }

// export interface MixedCaseIssue {
//   column: string;
//   example_variants: string[];
// }

// export interface OutlierColumnInfo {
//   column: string;
//   outlier_count: number;
//   lower_bound: number;
//   upper_bound: number;
// }

// export interface CorrelatedPair {
//   column_a: string;
//   column_b: string;
//   correlation: number;
// }

// export interface LowVarianceColumn {
//   column: string;
//   variance: number;
// }

// export interface Recommendation {
//   id: OperationId;
//   title: string;
//   description: string;
// }

// export interface AnalysisReport {
//   overview: DatasetOverview;
//   missing_values: MissingValuesReport;
//   duplicates: DuplicateReport;
//   invalid_data_types: InvalidDataTypeIssue[];
//   column_groups: ColumnGroups;
//   unique_values: UniqueValueInfo[];
//   null_columns: string[];
//   constant_columns: ConstantColumnInfo[];
//   whitespace_issues: WhitespaceIssue[];
//   mixed_case_issues: MixedCaseIssue[];
//   outliers: OutlierColumnInfo[];
//   highly_correlated_features: CorrelatedPair[];
//   low_variance_columns: LowVarianceColumn[];
//   potential_target_columns: string[];
//   potential_id_columns: string[];
// }

// export interface UploadAnalysisResponse {
//   session_id: string;
//   filename: string;
//   analysis: AnalysisReport;
//   recommended_operations: Recommendation[];
// }

// export interface PreviewResponse {
//   session_id: string;
//   columns: string[];
//   rows: Array<Record<string, CellValue>>;
//   total_rows: number;
// }

// // ---------------------------- Cleaning operations --------------------------

// export interface CleaningOperationParams {
//   [key: string]: string | number | boolean | string[] | Record<string, string> | undefined;
// }

// export interface CleaningOperation {
//   id: OperationId;
//   params: CleaningOperationParams;
// }

// export interface CleaningRequest {
//   operations: CleaningOperation[];
// }

// export interface CleaningResultItem {
//   id: OperationId;
//   success: boolean;
//   message: string;
//   details: Record<string, unknown>;
// }

// export interface CleaningResponse {
//   session_id: string;
//   results: CleaningResultItem[];
//   analysis: AnalysisReport;
// }

// // -------------------------- Feature engineering -----------------------------

// export interface FeatureEngineeringParams {
//   [key: string]:
//     | string
//     | number
//     | boolean
//     | string[]
//     | number[]
//     | Record<string, string[]>
//     | undefined;
// }

// export interface FeatureEngineeringOperation {
//   id: FeatureEngineeringId;
//   params: FeatureEngineeringParams;
// }

// export interface FeatureEngineeringRequest {
//   operations: FeatureEngineeringOperation[];
// }

// export interface FeatureEngineeringSuggestion {
//   id: FeatureEngineeringId;
//   title: string;
//   description: string;
//   applicable_columns: string[];
// }

// export interface FeatureEngineeringSuggestionsResponse {
//   session_id: string;
//   suggestions: FeatureEngineeringSuggestion[];
// }

// export interface FeatureEngineeringResultItem {
//   id: FeatureEngineeringId;
//   success: boolean;
//   message: string;
//   columns_created: string[];
// }

// export interface FeatureEngineeringResponse {
//   session_id: string;
//   results: FeatureEngineeringResultItem[];
//   columns: string[];
// }

// // -------------------------- Feature extraction ------------------------------

// export interface FeatureExtractionRequest {
//   method: FeatureExtractionMethod;
//   target_column?: string | null;
//   n_features?: number | null;
//   variance_threshold: number;
// }

// export interface FeatureImportance {
//   feature: string;
//   score: number;
// }

// export interface FeatureExtractionResponse {
//   session_id: string;
//   method: FeatureExtractionMethod;
//   selected_features: string[];
//   feature_importances: FeatureImportance[];
// }

// // ------------------------------ Final report ---------------------------------

// export interface CleaningReport {
//   session_id: string;
//   rows_before: number;
//   rows_after: number;
//   columns_before: number;
//   columns_after: number;
//   operations_applied: string[];
//   execution_time_seconds: number;
//   missing_values_removed: number;
//   duplicates_removed: number;
//   columns_renamed: Record<string, string>;
//   features_created: string[];
//   features_removed: string[];
//   feature_importance: FeatureImportance[];
//   download_url: string | null;
//   generated_at: string;
// }

// export interface ErrorResponse {
//   detail: string;
// }

// // ------------------------------ UI-only types ---------------------------------

// export type DataCleaningStep =
//   | "upload"
//   | "analysis"
//   | "preview"
//   | "cleaning"
//   | "results"
//   | "feature-engineering"
//   | "feature-extraction"
//   | "finalize";

// export type ExportFormat = "csv" | "xlsx" | "json";
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RagSource {
  content: string;
  source_file: string;
  page: number | null;
}

export interface DocMessage extends ChatMessage {
  sources?: RagSource[];
}

export interface DocStatus {
  ready: boolean;
  num_chunks: number;
  doc_names: string[];
}

export interface ImageItem {
  prompt: string;
  url: string | null;
  filepath: string | null;
}

export interface SqlSession {
  sessionId: string;
  tables: string[];
  schemaText: string;
  sourceName: string;
}

/* -----------------------------------------
 * SQL Chart Types
 * ----------------------------------------- */

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "scatter";

export interface ChartConfig {
  type: ChartType;

  title: string;

  // Used for Bar / Line / Scatter
  xKey?: string;
  yKey?: string;

  // Used for Pie
  nameKey?: string;
  valueKey?: string;

  data: Record<string, unknown>[];
}

/* -----------------------------------------
 * SQL Chat Exchange
 * ----------------------------------------- */

export interface SqlExchange {
  question: string;

  sql?: string;

  rows?: Record<string, unknown>[];

  rowCount?: number;

  chart?: ChartConfig;

  explanation?: string;

  cannotAnswerReason?: string;

  error?: string;

  streaming: boolean;
}


// ---------------------------------------------------------------------------
// TypeScript types for the AI-powered Data Cleaning module.
// Mirrors app/schemas/datacleaning.py field-for-field. No `any`.
// ---------------------------------------------------------------------------

// --------------------------------- Enums ---------------------------------

export type SupportedFileType = "csv" | "xlsx" | "xls" | "json";

export type MissingValueStrategy =
  | "mean"
  | "median"
  | "mode"
  | "constant"
  | "forward_fill"
  | "backward_fill";

export type OutlierMethod = "iqr" | "zscore";

export type TargetTypeCast = "numeric" | "datetime" | "category";

export type FeatureExtractionMethod =
  | "pca"
  | "select_k_best"
  | "variance_threshold"
  | "mutual_info"
  | "rfe"
  | "chi_square"
  | "anova"
  | "tree_importance"
  | "random_forest_importance"
  | "xgboost_importance"
  | "lasso";

export type DateFeaturePart =
  | "year"
  | "month"
  | "day"
  | "quarter"
  | "week"
  | "day_of_week"
  | "is_weekend";

export type OperationId =
  | "remove_duplicate_rows"
  | "remove_duplicate_columns"
  | "fill_missing"
  | "drop_rows_with_nulls"
  | "drop_columns_with_nulls"
  | "trim_whitespace"
  | "standardize_text"
  | "rename_columns"
  | "fix_data_types"
  | "remove_constant_columns"
  | "remove_low_variance_columns"
  | "remove_highly_correlated"
  | "normalize"
  | "standardize"
  | "one_hot_encode"
  | "label_encode"
  | "ordinal_encode"
  | "remove_outliers"
  | "feature_scaling"
  | "handle_infinite_values"
  | "remove_empty_rows"
  | "remove_empty_columns"
  | "remove_special_characters"
  | "parse_date_columns"
  | "detect_boolean_columns"
  | "convert_currency_columns"
  | "auto_detect_ids"
  | "auto_detect_target";

export type FeatureEngineeringId =
  | "date_features"
  | "age_calculation"
  | "bmi"
  | "income_groups"
  | "binning"
  | "interaction_features"
  | "polynomial_features"
  | "log_transform"
  | "sqrt_transform"
  | "ratio_features"
  | "aggregated_features"
  | "rolling_statistics"
  | "lag_features"
  | "custom_formula";

// A cell value coming back from a JSON dataset preview. Pandas can emit
// strings, numbers, booleans, or null (NaN is normalized to null server-side).
export type CellValue = string | number | boolean | null;

// ------------------------------ Analysis report ---------------------------

export interface DatasetOverview {
  rows: number;
  columns: number;
  memory_usage_bytes: number;
  memory_usage_human: string;
  dtypes: Record<string, string>;
}

export interface MissingValueColumn {
  column: string;
  missing_count: number;
  missing_percentage: number;
}

export interface MissingValuesReport {
  total_missing: number;
  columns_affected: MissingValueColumn[];
}

export interface DuplicateReport {
  duplicate_row_count: number;
  duplicate_column_count: number;
  duplicate_column_names: string[];
}

export interface InvalidDataTypeIssue {
  column: string;
  current_dtype: string;
  suspected_dtype: string;
  reason: string;
}

export interface ColumnGroups {
  categorical: string[];
  numerical: string[];
  datetime: string[];
  boolean: string[];
}

export interface UniqueValueInfo {
  column: string;
  unique_count: number;
  unique_ratio: number;
}

export interface ConstantColumnInfo {
  column: string;
  constant_value: CellValue;
}

export interface WhitespaceIssue {
  column: string;
  affected_rows: number;
}

export interface MixedCaseIssue {
  column: string;
  example_variants: string[];
}

export interface OutlierColumnInfo {
  column: string;
  outlier_count: number;
  lower_bound: number;
  upper_bound: number;
}

export interface CorrelatedPair {
  column_a: string;
  column_b: string;
  correlation: number;
}

export interface LowVarianceColumn {
  column: string;
  variance: number;
}

export interface Recommendation {
  id: OperationId;
  title: string;
  description: string;
}

export interface AnalysisReport {
  overview: DatasetOverview;
  missing_values: MissingValuesReport;
  duplicates: DuplicateReport;
  invalid_data_types: InvalidDataTypeIssue[];
  column_groups: ColumnGroups;
  unique_values: UniqueValueInfo[];
  null_columns: string[];
  constant_columns: ConstantColumnInfo[];
  whitespace_issues: WhitespaceIssue[];
  mixed_case_issues: MixedCaseIssue[];
  outliers: OutlierColumnInfo[];
  highly_correlated_features: CorrelatedPair[];
  low_variance_columns: LowVarianceColumn[];
  potential_target_columns: string[];
  potential_id_columns: string[];
}

export interface UploadAnalysisResponse {
  session_id: string;
  filename: string;
  analysis: AnalysisReport;
  recommended_operations: Recommendation[];
}

export interface PreviewResponse {
  session_id: string;
  columns: string[];
  rows: Array<Record<string, CellValue>>;
  total_rows: number;
}

// ---------------------------- Cleaning operations --------------------------

export interface CleaningOperationParams {
  [key: string]: string | number | boolean | string[] | Record<string, string> | undefined;
}

export interface CleaningOperation {
  id: OperationId;
  params: CleaningOperationParams;
}

export interface CleaningRequest {
  operations: CleaningOperation[];
}

export interface CleaningResultItem {
  id: OperationId;
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}

export interface CleaningResponse {
  session_id: string;
  results: CleaningResultItem[];
  analysis: AnalysisReport;
}

// -------------------------- Feature engineering -----------------------------

export interface FeatureEngineeringParams {
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | Record<string, string[]>
    | undefined;
}

export interface FeatureEngineeringOperation {
  id: FeatureEngineeringId;
  params: FeatureEngineeringParams;
}

export interface FeatureEngineeringRequest {
  operations: FeatureEngineeringOperation[];
}

export interface FeatureEngineeringSuggestion {
  id: FeatureEngineeringId;
  title: string;
  description: string;
  applicable_columns: string[];
}

export interface FeatureEngineeringSuggestionsResponse {
  session_id: string;
  suggestions: FeatureEngineeringSuggestion[];
}

export interface FeatureEngineeringResultItem {
  id: FeatureEngineeringId;
  success: boolean;
  message: string;
  columns_created: string[];
}

export interface FeatureEngineeringResponse {
  session_id: string;
  results: FeatureEngineeringResultItem[];
  columns: string[];
}

// -------------------------- Feature extraction ------------------------------

export interface FeatureExtractionRequest {
  method: FeatureExtractionMethod;
  target_column?: string | null;
  n_features?: number | null;
  variance_threshold: number;
}

export interface FeatureImportance {
  feature: string;
  score: number;
}

export interface FeatureExtractionResponse {
  session_id: string;
  method: FeatureExtractionMethod;
  selected_features: string[];
  feature_importances: FeatureImportance[];
}

// ------------------------------ Final report ---------------------------------

export interface CleaningReport {
  session_id: string;
  rows_before: number;
  rows_after: number;
  columns_before: number;
  columns_after: number;
  operations_applied: string[];
  execution_time_seconds: number;
  missing_values_removed: number;
  duplicates_removed: number;
  columns_renamed: Record<string, string>;
  features_created: string[];
  features_removed: string[];
  feature_importance: FeatureImportance[];
  download_url: string | null;
  generated_at: string;
}

export interface ErrorResponse {
  detail: string;
}

// ------------------------------ UI-only types ---------------------------------

export type DataCleaningStep =
  | "upload"
  | "analysis"
  | "preview"
  | "cleaning"
  | "results"
  | "feature-engineering"
  | "feature-extraction"
  | "finalize";

export type ExportFormat = "csv" | "xlsx" | "json";

// ---------------------------------------------------------------------------
// TypeScript types for the AI-powered Analytics Dashboard module.
// Mirrors app/schemas/analytics.py field-for-field. No `any`.
// ---------------------------------------------------------------------------

export interface AnalyticsRequest {
  records: Record<string, unknown>[];
  dataset_name?: string | null;
}

export interface DatasetSummary {
  total_rows: number;
  total_columns: number;
  duplicate_rows: number;
  missing_values: number;
  missing_percentage: number;
  memory_usage_bytes: number;
  memory_usage_readable: string;
  numeric_column_count: number;
  categorical_column_count: number;
  datetime_column_count: number;
  boolean_column_count: number;
}

export interface NumericColumnStats {
  column: string;
  count: number;
  mean: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;
  sum: number | null;
  std: number | null;
  variance: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
}

export type KpiFormat = "number" | "currency" | "percentage";

export interface KPI {
  label: string;
  value: number;
  format: KpiFormat | string;
  source_column: string | null;
}

export interface CategoryValue {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoryColumnAnalysis {
  column: string;
  unique_count: number;
  top_categories: CategoryValue[];
}

export interface TrendPoint {
  period: string;
  value: number;
}

export type TrendGranularity = "day" | "week" | "month" | "year";

export interface TrendSeries {
  granularity: TrendGranularity | string;
  metric_column: string;
  points: TrendPoint[];
}

export interface TrendAnalysis {
  datetime_column: string | null;
  series: TrendSeries[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: (number | null)[][];
}

export interface OutlierReport {
  column: string;
  outlier_count: number;
  outlier_percentage: number;
  lower_bound: number;
  upper_bound: number;
}

export interface MissingValueReport {
  column: string;
  missing_count: number;
  missing_percentage: number;
}

export interface DataQualityScore {
  score: number;
  reasoning: string[];
  recommendations: string[];
}

export interface ChartRecommendation {
  chart_type: string;
  columns: string[];
  reason: string;
}

export interface DashboardMetadata {
  generated_at: string;
  analysis_time_ms: number;
  dataset_name: string | null;
  row_count: number;
  column_count: number;
}

export interface AnalyticsDashboardResponse {
  metadata: DashboardMetadata;
  summary: DatasetSummary;
  numeric_statistics: NumericColumnStats[];
  kpis: KPI[];
  category_analysis: CategoryColumnAnalysis[];
  trend_analysis: TrendAnalysis;
  correlation: CorrelationMatrix | null;
  outliers: OutlierReport[];
  missing_report: MissingValueReport[];
  quality_score: DataQualityScore;
  insights: string[];
  recommended_charts: ChartRecommendation[];
}

export interface AnalyticsErrorResponse {
  detail: string;
}
