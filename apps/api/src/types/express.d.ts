import 'express';

declare module 'express' {
  interface Request {
    clinicId?: string;
    clinicStatus?: string;
    employerId?: string;
    employerStatus?: string;
  }
}
