import { uploadCapturedJob } from "./upload-job.mjs";

const result = await uploadCapturedJob(
  {
    jobId: 124,
    printerName: "Microsoft Print to PDF",
    machineName: "engineering-office-pc-01",
    username: "ASUS",
    documentName: "ihap.pdf",
    datatype: "PDF",
    driverName: "Microsoft Print To PDF",
    status: "captured",
    pagesTotal: 1,
    submittedAt: new Date().toISOString(),
    contentType: "application/pdf"
  },
  "C:/Users/ASUS/Documents/ihap.pdf"
);

console.log("PDF upload confirmed:", result);
