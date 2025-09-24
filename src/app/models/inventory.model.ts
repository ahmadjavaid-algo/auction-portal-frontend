export interface Inventory {
  inventoryId: number;
  productId: number;
  productJSON: string;
  description: string;

  // audit (optional on the wire)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}