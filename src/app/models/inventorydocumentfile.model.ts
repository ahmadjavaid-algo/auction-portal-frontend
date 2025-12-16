export interface InventoryDocumentFile {
  
  documentFileId: number;
  inventoryDocumentFileId: number;
  inventoryId: number;

  
  documentDisplayName?: string | null;
  documentName?: string | null;
  documentUrl?: string | null;
  DocumentThumbnailUrl?: string | null;
  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
