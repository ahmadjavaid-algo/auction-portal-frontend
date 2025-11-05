export interface Inventory {
  inventoryId: number;
  productId: number;

  
  displayName?: string;

  productJSON: string | null;
  description: string | null;

  
  chassisNo?: string | null;
  registrationNo?: string | null;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
