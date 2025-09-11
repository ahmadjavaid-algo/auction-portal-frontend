// src/app/models/email.model.ts
export interface Email {
  // Audit
  createdById?: number | null;
  createdDate?: string | null;   // ISO string from server
  modifiedById?: number | null;
  modifiedDate?: string | null;  // ISO string from server
  active?: boolean;

  // Columns
  emailId: number;
  emailCode?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  emailTo?: string | null;
  emailFrom?: string | null;
}
