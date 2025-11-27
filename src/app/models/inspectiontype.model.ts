export interface InspectionType {
  inspectionTypeId: number;
  inspectionTypeName: string;
  weightage: number;

 
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active: boolean;
}
