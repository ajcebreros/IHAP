import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const API_URL = process.env.PRINT_API_URL;
const TOKEN = process.env.PRINT_AGENT_TOKEN;
const AGENT_ID = process.env.PRINT_AGENT_ID;

export async function uploadCapturedJob(metadata, payloadPath) {
  if (!API_URL || !TOKEN || !AGENT_ID) {
    throw new Error("Missing PRINT_API_URL, PRINT_AGENT_TOKEN, or PRINT_AGENT_ID");
  }

  const bytes = await fs.readFile(payloadPath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const captureId = crypto.randomUUID();
  const form = new FormData();

  const fields = {
    agent_id: AGENT_ID,
    capture_id: captureId,
    source_job_id: String(metadata.jobId ?? ""),
    printer_name: metadata.printerName ?? "Test Printer",
    machine_name: metadata.machineName ?? "",
    username: metadata.username ?? "",
    document_name: metadata.documentName ?? "",
    datatype: metadata.datatype ?? "",
    driver_name: metadata.driverName ?? "",
    status: metadata.status ?? "captured",
    pages_total: String(metadata.pagesTotal ?? ""),
    submitted_at: metadata.submittedAt ?? "",
    content_type: metadata.contentType ?? "application/octet-stream"
  };

  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }

  form.set(
    "document",
    new Blob([bytes], { type: "application/octet-stream" }),
    path.basename(payloadPath)
  );

  const response = await fetch(`${API_URL}/api/print-jobs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
    signal: AbortSignal.timeout(120000)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status} - ${result.error ?? "Unknown error"}`);
  }

  if (!result.ok || result.sha256 !== sha256) {
    throw new Error("Server acknowledgment or SHA-256 verification failed");
  }

  return result;
}
