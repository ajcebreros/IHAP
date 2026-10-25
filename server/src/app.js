require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const multer = require("multer");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "32kb" }));

const {
  PORT = 3000,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  AGENT_TOKEN
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AGENT_TOKEN) {
  throw new Error("Missing required server environment variables");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }
});

function authenticateAgent(req, res, next) {
  const header = req.get("authorization") || "";
  const supplied = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  const a = Buffer.from(supplied);
  const b = Buffer.from(AGENT_TOKEN);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  next();
}

function optionalString(value, max = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/print-jobs",
  authenticateAgent,
  upload.single("document"),
  async (req, res) => {
    let storagePath;

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          ok: false,
          error: "Missing document file"
        });
      }

      const agentId = optionalString(req.body.agent_id, 100);
      const printerName = optionalString(req.body.printer_name, 255);
      const captureId = optionalString(req.body.capture_id, 36);
      const contentType = optionalString(req.body.content_type, 150)
        || "application/octet-stream";

      if (!agentId || !printerName || !captureId) {
        return res.status(400).json({
          ok: false,
          error: "agent_id, printer_name and capture_id are required"
        });
      }

      if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(captureId)) {
        return res.status(400).json({
          ok: false,
          error: "capture_id must be a UUID"
        });
      }

      const sha256 = crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");

      // Keep filenames opaque; never use a user-supplied filename as a path.
      storagePath = `${agentId}/${captureId}.bin`;

      const { error: storageError } = await supabase.storage
        .from("print-payloads")
        .upload(storagePath, file.buffer, {
          contentType: "application/octet-stream",
          upsert: false
        });

      if (storageError) {
        // A duplicate upload may already have succeeded.
        return res.status(500).json({
          ok: false,
          error: "Could not store captured payload"
        });
      }

      const rawJobId = Number(req.body.source_job_id);
      const rawPages = Number(req.body.pages_total);
      const submittedAt = optionalString(req.body.submitted_at, 80);

      const record = {
        agent_id: agentId,
        capture_id: captureId,
        source_job_id: Number.isSafeInteger(rawJobId) && rawJobId >= 0
          ? rawJobId : null,
        printer_name: printerName,
        machine_name: optionalString(req.body.machine_name, 255),
        windows_username: optionalString(req.body.username, 255),
        document_name: optionalString(req.body.document_name, 500),
        datatype: optionalString(req.body.datatype, 100),
        driver_name: optionalString(req.body.driver_name, 255),
        job_status: optionalString(req.body.status, 100) || "captured",
        pages_total: Number.isSafeInteger(rawPages) && rawPages >= 0
          ? rawPages : null,
        submitted_at: submittedAt && !Number.isNaN(Date.parse(submittedAt))
          ? new Date(submittedAt).toISOString() : null,
        content_type: contentType,
        storage_path: storagePath,
        payload_size: file.size,
        payload_sha256: sha256
      };

      const { error: insertError } = await supabase
        .from("spooler_captures")
        .insert(record);

      if (insertError) {
        // Avoid leaving an unreferenced object behind.
        await supabase.storage.from("print-payloads").remove([storagePath]);
        storagePath = null;

        if (insertError.code === "23505") {
          return res.status(409).json({
            ok: false,
            error: "This capture was already submitted"
          });
        }

        console.error("Metadata insert failed:", insertError.message);
        return res.status(500).json({
          ok: false,
          error: "Could not save capture metadata"
        });
      }

      return res.status(201).json({
        ok: true,
        capture_id: captureId,
        sha256,
        payload_size: file.size
      });
    } catch (error) {
      console.error("Capture upload failed:", error.message);
      return res.status(500).json({
        ok: false,
        error: "Capture upload failed"
      });
    }
  }
);


app.post(
  "/api/print-job-events",
  authenticateAgent,
  async (req, res) => {
    try {
      const agentId = optionalString(req.body.agent_id, 100);
      const rawRecordId = req.body.event_record_id;
      const recordId = Number(rawRecordId);
      const rawJobId = req.body.source_job_id;
      const jobId = rawJobId == null || rawJobId === ""
        ? null
        : Number(rawJobId);
      const rawPages = req.body.pages_printed;
      const pages = rawPages == null || rawPages === ""
        ? null
        : Number(rawPages);
      const rawSize = req.body.job_size_bytes;
      const size = rawSize == null || rawSize === ""
        ? null
        : Number(rawSize);
      const printedAt = optionalString(req.body.printed_at, 80);

      if (
        !agentId ||
        !Number.isSafeInteger(recordId) ||
        recordId < 1 ||
        !printedAt ||
        Number.isNaN(Date.parse(printedAt))
      ) {
        return res.status(400).json({
          ok: false,
          error: "Valid agent_id, event_record_id and printed_at are required"
        });
      }

      if (
        (jobId !== null && (!Number.isSafeInteger(jobId) || jobId < 0)) ||
        (pages !== null && (!Number.isSafeInteger(pages) || pages < 0)) ||
        (size !== null && (!Number.isSafeInteger(size) || size < 0))
      ) {
        return res.status(400).json({
          ok: false,
          error: "Invalid numeric metadata"
        });
      }

      const record = {
        agent_id: agentId,
        event_record_id: recordId,
        source_job_id: jobId,
        printer_name: optionalString(req.body.printer_name, 255),
        windows_username: optionalString(req.body.windows_username, 255),
        machine_name: optionalString(req.body.machine_name, 255),
        document_name: optionalString(req.body.document_name, 500),
        port_name: optionalString(req.body.port_name, 255),
        pages_printed: pages,
        job_size_bytes: size,
        printed_at: new Date(printedAt).toISOString()
      };

      const { error } = await supabase
        .from("print_job_events")
        .insert(record);

      if (error?.code === "23505") {
        return res.status(200).json({
          ok: true,
          duplicate: true
        });
      }

      if (error) {
        console.error("Print event insert failed:", error.message);
        return res.status(500).json({
          ok: false,
          error: "Could not save print event"
        });
      }

     
      return res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Print event processing failed:", error.message);
      return res.status(500).json({
        ok: false,
        error: "Print event processing failed"
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`IHAP print collector listening on port ${PORT}`);
});


