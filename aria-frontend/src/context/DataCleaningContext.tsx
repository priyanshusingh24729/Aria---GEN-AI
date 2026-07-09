"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as api from "@/lib/api/datacleaning";
import type {
  AnalysisReport,
  CleaningOperation,
  CleaningResultItem,
  CleaningReport,
  DataCleaningStep,
  ExportFormat,
  FeatureEngineeringOperation,
  FeatureEngineeringResultItem,
  FeatureEngineeringSuggestion,
  FeatureExtractionMethod,
  FeatureImportance,
  PreviewResponse,
  Recommendation,
} from "@/lib/api/types";

interface DataCleaningState {
  step: DataCleaningStep;
  isLoading: boolean;
  loadingMessage: string | null;
  error: string | null;

  sessionId: string | null;
  filename: string | null;
  uploadProgress: number;

  analysis: AnalysisReport | null;
  recommendations: Recommendation[];

  preview: PreviewResponse | null;

  cleaningResults: CleaningResultItem[];

  featureSuggestions: FeatureEngineeringSuggestion[];
  featureEngineeringResults: FeatureEngineeringResultItem[];

  selectedFeatures: string[];
  featureImportances: FeatureImportance[];
  extractionMethod: FeatureExtractionMethod | null;

  finalReport: CleaningReport | null;
}

const initialState: DataCleaningState = {
  step: "upload",
  isLoading: false,
  loadingMessage: null,
  error: null,

  sessionId: null,
  filename: null,
  uploadProgress: 0,

  analysis: null,
  recommendations: [],

  preview: null,

  cleaningResults: [],

  featureSuggestions: [],
  featureEngineeringResults: [],

  selectedFeatures: [],
  featureImportances: [],
  extractionMethod: null,

  finalReport: null,
};

interface DataCleaningContextValue extends DataCleaningState {
  upload: (file: File) => Promise<void>;
  refreshPreview: (rows?: number) => Promise<void>;
  refreshAnalysis: () => Promise<void>;
  applyCleaning: (operations: CleaningOperation[]) => Promise<void>;
  loadFeatureSuggestions: () => Promise<void>;
  applyFeatureEngineering: (operations: FeatureEngineeringOperation[]) => Promise<void>;
  runFeatureExtraction: (
    method: FeatureExtractionMethod,
    targetColumn: string | null,
    nFeatures: number | null,
    varianceThreshold: number
  ) => Promise<void>;
  confirmFeatureSelection: (keepColumns: string[]) => Promise<void>;
  finalize: (format?: ExportFormat) => Promise<void>;
  download: (format?: ExportFormat) => Promise<void>;
  reset: () => void;
  goToStep: (step: DataCleaningStep) => void;
  clearError: () => void;
}

const DataCleaningContext = createContext<DataCleaningContextValue | undefined>(undefined);

export function DataCleaningProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataCleaningState>(initialState);

  const patch = useCallback((partial: Partial<DataCleaningState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const withLoading = useCallback(
    async <T,>(message: string, fn: () => Promise<T>): Promise<T | undefined> => {
      patch({ isLoading: true, loadingMessage: message, error: null });
      try {
        return await fn();
      } catch (err) {
        const detail =
          err instanceof api.DataCleaningApiError ? err.detail : "Something went wrong. Try again.";
        patch({ error: detail });
        return undefined;
      } finally {
        patch({ isLoading: false, loadingMessage: null });
      }
    },
    [patch]
  );

  const upload = useCallback(
    async (file: File) => {
      patch({ uploadProgress: 0 });
      await withLoading("Uploading dataset…", async () => {
        const result = await api.uploadDataset(file, (percent) => patch({ uploadProgress: percent }));
        patch({
          sessionId: result.session_id,
          filename: result.filename,
          analysis: result.analysis,
          recommendations: result.recommended_operations,
          step: "analysis",
          uploadProgress: 100,
        });
        const preview = await api.getPreview(result.session_id);
        patch({ preview });
      });
    },
    [patch, withLoading]
  );

  const refreshPreview = useCallback(
    async (rows = 20) => {
      if (!state.sessionId) return;
      await withLoading("Refreshing preview…", async () => {
        const preview = await api.getPreview(state.sessionId as string, rows);
        patch({ preview });
      });
    },
    [state.sessionId, patch, withLoading]
  );

  const refreshAnalysis = useCallback(async () => {
    if (!state.sessionId) return;
    await withLoading("Re-analyzing dataset…", async () => {
      const result = await api.getAnalysis(state.sessionId as string);
      patch({ analysis: result.analysis, recommendations: result.recommended_operations });
    });
  }, [state.sessionId, patch, withLoading]);

  const applyCleaning = useCallback(
    async (operations: CleaningOperation[]) => {
      if (!state.sessionId) return;
      await withLoading("Applying cleaning operations…", async () => {
        const response = await api.applyCleaning(state.sessionId as string, operations);
        patch({
          cleaningResults: response.results,
          analysis: response.analysis,
          step: "results",
        });
        const preview = await api.getPreview(state.sessionId as string);
        patch({ preview });
      });
    },
    [state.sessionId, patch, withLoading]
  );

  const loadFeatureSuggestions = useCallback(async () => {
    if (!state.sessionId) return;
    await withLoading("Looking for feature ideas…", async () => {
      const response = await api.getFeatureEngineeringSuggestions(state.sessionId as string);
      patch({ featureSuggestions: response.suggestions, step: "feature-engineering" });
    });
  }, [state.sessionId, patch, withLoading]);

  const applyFeatureEngineering = useCallback(
    async (operations: FeatureEngineeringOperation[]) => {
      if (!state.sessionId) return;
      await withLoading("Engineering features…", async () => {
        const response = await api.applyFeatureEngineering(state.sessionId as string, operations);
        patch({ featureEngineeringResults: response.results });
        const preview = await api.getPreview(state.sessionId as string);
        patch({ preview });
      });
    },
    [state.sessionId, patch, withLoading]
  );

  const runFeatureExtraction = useCallback(
    async (
      method: FeatureExtractionMethod,
      targetColumn: string | null,
      nFeatures: number | null,
      varianceThreshold: number
    ) => {
      if (!state.sessionId) return;
      await withLoading("Ranking features…", async () => {
        const response = await api.applyFeatureExtraction(
          state.sessionId as string,
          method,
          targetColumn,
          nFeatures,
          varianceThreshold
        );
        patch({
          selectedFeatures: response.selected_features,
          featureImportances: response.feature_importances,
          extractionMethod: response.method,
          step: "feature-extraction",
        });
      });
    },
    [state.sessionId, patch, withLoading]
  );

  const confirmFeatureSelection = useCallback(
    async (keepColumns: string[]) => {
      if (!state.sessionId) return;
      await withLoading("Applying selected features…", async () => {
        const preview = await api.applyFeatureSelection(state.sessionId as string, keepColumns);
        patch({ preview });
      });
    },
    [state.sessionId, patch, withLoading]
  );

  const finalize = useCallback(
    async (format: ExportFormat = "csv") => {
      if (!state.sessionId) return;
      await withLoading("Finalizing dataset…", async () => {
        const report = await api.finalizeDataset(state.sessionId as string, format);
        patch({ finalReport: report, step: "finalize" });
      });
    },
    [state.sessionId, patch, withLoading]
  );

  const download = useCallback(
    async (format: ExportFormat = "csv") => {
      if (!state.sessionId) return;
      await withLoading("Preparing download…", async () => {
        await api.downloadDataset(state.sessionId as string, format, state.filename ?? undefined);
      });
    },
    [state.sessionId, state.filename, withLoading]
  );

  const reset = useCallback(() => {
    if (state.sessionId) {
      api.deleteSession(state.sessionId).catch(() => undefined);
    }
    setState(initialState);
  }, [state.sessionId]);

  const goToStep = useCallback((step: DataCleaningStep) => patch({ step }), [patch]);
  const clearError = useCallback(() => patch({ error: null }), [patch]);

  const value = useMemo<DataCleaningContextValue>(
    () => ({
      ...state,
      upload,
      refreshPreview,
      refreshAnalysis,
      applyCleaning,
      loadFeatureSuggestions,
      applyFeatureEngineering,
      runFeatureExtraction,
      confirmFeatureSelection,
      finalize,
      download,
      reset,
      goToStep,
      clearError,
    }),
    [
      state,
      upload,
      refreshPreview,
      refreshAnalysis,
      applyCleaning,
      loadFeatureSuggestions,
      applyFeatureEngineering,
      runFeatureExtraction,
      confirmFeatureSelection,
      finalize,
      download,
      reset,
      goToStep,
      clearError,
    ]
  );

  return <DataCleaningContext.Provider value={value}>{children}</DataCleaningContext.Provider>;
}

export function useDataCleaning(): DataCleaningContextValue {
  const ctx = useContext(DataCleaningContext);
  if (!ctx) {
    throw new Error("useDataCleaning must be used within a DataCleaningProvider");
  }
  return ctx;
}
