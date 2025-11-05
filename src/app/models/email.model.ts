
export interface Email {
  
  createdById?: number | null;
  createdDate?: string | null;   
  modifiedById?: number | null;
  modifiedDate?: string | null;  
  active?: boolean;

  
  emailId: number;
  emailCode?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  emailTo?: string | null;
  emailFrom?: string | null;
}
