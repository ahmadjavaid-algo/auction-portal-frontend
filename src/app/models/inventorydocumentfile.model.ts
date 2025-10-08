export interface InventoryDocumentFile {
  // PKs / FKs
  documentFileId: number;
  inventoryDocumentFileId: number;
  inventoryId: number;

  // Names & links
  documentDisplayName?: string | null;
  documentName?: string | null;
  documentUrl?: string | null;

  // Audit
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
