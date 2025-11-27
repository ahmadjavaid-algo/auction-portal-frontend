
export interface InventoryInspector {
  inventoryInspectorId: number;
  assignedTo?: number | null;
  inventoryId: number;
  inspectorName?: string | null;

  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active: boolean;
}
