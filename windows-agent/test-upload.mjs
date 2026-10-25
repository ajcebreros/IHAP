import { uploadCapturedJob } from "./upload-job.mjs";

const result = await uploadCapturedJob(
  {
    jobId: 123,
    printerName: "Test Printer",
    machineName: "engineering-office-pc-01",
    username: "test-user",
    documentName: "test-document",
    datatype: "RAW",
    driverName: "Test Driver",
    status: "captured",
    pagesTotal: 1,
    submittedAt: new Date().toISOString(),
    contentType: "application/octet-stream"
  },
  "./test-print.bin"
);

console.log("Upload confirmed:", result);