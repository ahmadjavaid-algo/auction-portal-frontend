export interface Inventory {
  inventoryId: number;
  productId: number;

  /** from GetAll join; optional on some calls */
  displayName?: string;

  productJSON: string | null;
  description: string | null;

  /** NEW */
  chassisNo?: string | null;
  registrationNo?: string | null;

  // audit (optional on the wire)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
