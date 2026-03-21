export type DocStatus = "pending" | "processing" | "complete" | "failed";
export type DocType = "lab_result" | "prescription" | "radiology" | "report" | "unknown";
export type FlagLevel = "normal" | "borderline" | "abnormal" | "critical";

export interface Finding {
  id: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: FlagLevel;
  interpretation: string;
}

export interface RiskFlag {
  id: string;
  level: "info" | "warn" | "critical";
  title: string;
  detail: string;
}

export interface DocResult {
  docType: DocType;
  title: string;
  issuedBy: string;
  issuedDate: string;
  patientName: string;
  summary: string;
  findings: Finding[];
  riskFlags: RiskFlag[];
  plainEnglish: string;
  recommendations: string[];
  processingTime: number;
}

export interface MedDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  status: DocStatus;
  uploadedAt: string;
  createdAt: string;
  result?: DocResult;
  fileUrl: string;
}

export interface UploadFile {
  file: File;
  id: string;
  docType: DocType;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
}
