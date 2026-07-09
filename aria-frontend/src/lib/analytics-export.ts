"use client";

/**
 * Client-side "download the dashboard" feature.
 *
 * AnalyticsPage (AnalyticsBody) points `dashboardRef.current` at the DOM node
 * that wraps the rendered dashboard content. AnalyticsHeader's "Download
 * Report" button calls `downloadDashboardAsPdf()`, which rasterizes that
 * node with html2canvas and slices it into A4 pages with jsPDF.
 *
 * Requires two extra deps: `npm install html2canvas jspdf`
 */

export const dashboardRef: { current: HTMLDivElement | null } = { current: null };

export class DashboardExportError extends Error {}

function slug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "dataset";
}

export async function downloadDashboardAsPdf(datasetName?: string | null) {
  const node = dashboardRef.current;
  if (!node) {
    throw new DashboardExportError("Dashboard isn't ready to export yet.");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, {
    backgroundColor: "#05070d",
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png", 1.0);

  // A4 in points, with a small margin on every page.
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;

  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
  heightLeft -= usableHeight;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
    heightLeft -= usableHeight;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  pdf.save(`${slug(datasetName ?? "dataset")}-analytics-report-${stamp}.pdf`);
}