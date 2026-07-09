import { apiPostJSON } from "@/lib/api/client";
import type {
  AnalyticsDashboardResponse,
  AnalyticsErrorResponse,
  AnalyticsRequest,
} from "@/lib/api/types";

/**
 * POST /analytics/analyze
 *
 * Sends DataFrame rows (JSON records) to the backend and returns the full
 * dashboard payload. Throws a plain Error with the backend's `detail`
 * message on non-2xx responses so callers can surface it directly.
 */
export async function analyzeDataset(
  request: AnalyticsRequest
): Promise<AnalyticsDashboardResponse> {
  const res = await apiPostJSON("/analytics/analyze", request);

  if (!res.ok) {
    let detail = `Analytics request failed (${res.status})`;
    try {
      const body = (await res.json()) as AnalyticsErrorResponse;
      if (body?.detail) detail = body.detail;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(detail);
  }

  return (await res.json()) as AnalyticsDashboardResponse;
}
