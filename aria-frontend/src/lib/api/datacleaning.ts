import { apiGet, apiPostJSON, apiPostForm, apiDelete, API_BASE } from "@/lib/api/client";
import type {
  CleaningOperation,
  CleaningReport,
  CleaningRequest,
  CleaningResponse,
  ExportFormat,
  FeatureEngineeringOperation,
  FeatureEngineeringRequest,
  FeatureEngineeringResponse,
  FeatureEngineeringSuggestionsResponse,
  FeatureExtractionMethod,
  FeatureExtractionResponse,
  PreviewResponse,
  UploadAnalysisResponse,
} from "@/lib/api/types";

export class DataCleaningApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "DataCleaningApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handle<T>(responsePromise: Promise<Response>): Promise<T> {
  const response = await responsePromise;

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      // no JSON body — fall back to statusText
    }
    throw new DataCleaningApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --------------------------------- Upload ----------------------------------

export async function uploadDataset(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (!onProgress) {
    return handle<UploadAnalysisResponse>(
      apiPostForm("/datacleaning/upload", formData)
    );
  }

  // XHR path needed for upload progress (fetch has no upload progress event)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/datacleaning/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as UploadAnalysisResponse);
        } else {
          reject(new DataCleaningApiError(xhr.status, body?.detail ?? xhr.statusText));
        }
      } catch {
        reject(new DataCleaningApiError(xhr.status, xhr.statusText));
      }
    };

    xhr.onerror = () => reject(new DataCleaningApiError(0, "Network error during upload."));
    xhr.send(formData);
  });
}

// ------------------------------ Preview & analysis --------------------------

export function getPreview(sessionId: string, rows = 20): Promise<PreviewResponse> {
  return handle<PreviewResponse>(apiGet(`/datacleaning/${sessionId}/preview?rows=${rows}`));
}

export function getAnalysis(sessionId: string): Promise<UploadAnalysisResponse> {
  return handle<UploadAnalysisResponse>(apiGet(`/datacleaning/${sessionId}/analysis`));
}

// --------------------------------- Cleaning ----------------------------------

export function applyCleaning(
  sessionId: string,
  operations: CleaningOperation[]
): Promise<CleaningResponse> {
  const payload: CleaningRequest = { operations };
  return handle<CleaningResponse>(apiPostJSON(`/datacleaning/${sessionId}/clean`, payload));
}

// --------------------------- Feature engineering -------------------------------

export function getFeatureEngineeringSuggestions(
  sessionId: string
): Promise<FeatureEngineeringSuggestionsResponse> {
  return handle<FeatureEngineeringSuggestionsResponse>(
    apiGet(`/datacleaning/${sessionId}/feature-engineering/suggestions`)
  );
}

export function applyFeatureEngineering(
  sessionId: string,
  operations: FeatureEngineeringOperation[]
): Promise<FeatureEngineeringResponse> {
  const payload: FeatureEngineeringRequest = { operations };
  return handle<FeatureEngineeringResponse>(
    apiPostJSON(`/datacleaning/${sessionId}/feature-engineering`, payload)
  );
}

// --------------------------- Feature extraction ---------------------------------

export function applyFeatureExtraction(
  sessionId: string,
  method: FeatureExtractionMethod,
  targetColumn: string | null,
  nFeatures: number | null,
  varianceThreshold: number
): Promise<FeatureExtractionResponse> {
  return handle<FeatureExtractionResponse>(
    apiPostJSON(`/datacleaning/${sessionId}/feature-extraction`, {
      method,
      target_column: targetColumn,
      n_features: nFeatures,
      variance_threshold: varianceThreshold,
    })
  );
}

export function applyFeatureSelection(
  sessionId: string,
  keepColumns: string[]
): Promise<PreviewResponse> {
  return handle<PreviewResponse>(
    apiPostJSON(`/datacleaning/${sessionId}/feature-extraction/apply`, keepColumns)
  );
}

// ------------------------------- Finalize & download ------------------------------

export function finalizeDataset(
  sessionId: string,
  fileFormat: ExportFormat = "csv"
): Promise<CleaningReport> {
  return handle<CleaningReport>(
    apiPostJSON(`/datacleaning/${sessionId}/finalize?file_format=${fileFormat}`, {})
  );
}

export function getDownloadUrl(sessionId: string, format: ExportFormat = "csv"): string {
  return `${API_BASE}/api/datacleaning/${sessionId}/download?format=${format}`;
}

export async function downloadDataset(
  sessionId: string,
  format: ExportFormat = "csv",
  filename?: string
): Promise<void> {
  const response = await apiGet(`/datacleaning/${sessionId}/download?format=${format}`);
  if (!response.ok) {
    throw new DataCleaningApiError(response.status, "Failed to download dataset.");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `cleaned_dataset_${sessionId}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

// ----------------------------------- Session ---------------------------------------

export function deleteSession(sessionId: string): Promise<void> {
  return handle<void>(apiDelete(`/datacleaning/${sessionId}`));
}