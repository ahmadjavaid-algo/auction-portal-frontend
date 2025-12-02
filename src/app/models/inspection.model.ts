// src/app/models/inspection.model.ts

export interface Inspection {
  inspectionId: number;

  inspectionTypeId: number;
  inspectionTypeName: string;

  inspectionCheckpointId: number;
  inspectionCheckpointName: string;
  inputType?: string | null;

  inventoryId: number;
  productId: number;
  productDisplayName: string;
  productJSON?: string | null;
  inventoryDescription?: string | null;

  result?: string | null;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean | null;
}
