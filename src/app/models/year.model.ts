export interface Year {
  yearId: number;
  modelId: number;
  yearName: string;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}