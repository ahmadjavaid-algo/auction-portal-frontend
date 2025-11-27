export interface InspectionCheckpoint {
  inspectionCheckpointId: number;
  inspectionTypeId: number;
  inspectionCheckpointName: string;
  inputType: string;

  
  inspectionTypeName?: string | null;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active: boolean;
}
