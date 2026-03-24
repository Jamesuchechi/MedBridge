export interface Differential {
  condition?: string;
  diagnosis?: string;
  confidence: number;
  reasoning?: string;
  urgency?: string;
}

export interface ClinicalSummary {
  chiefComplaint?: string;
  summary?: string;
  differentials?: Differential[];
  recommendedTests?: string[];
  investigations?: string[];
}

export interface Referral {
  id: string;
  patientName: string;
  patientAge?: string | number;
  patientSex?: string;
  specialty: string;
  priority: string;
  status: "pending" | "accepted" | "rejected" | "completed" | string;
  notes?: string;
  clinicalSummary: string | ClinicalSummary;
  sendingDoctorId: string;
  sendingDoctorName?: string;
  receivingDoctorId: string | null;
  receivingFacility: string | null;
  createdAt: string;
  updatedAt?: string;
}
