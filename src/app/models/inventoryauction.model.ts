export interface InventoryAuction {
  inventoryauctionId: number;
  inventoryauctionStatusId: number;
  inventoryId: number;
  auctionId: number;

  buyNowPrice: number;  
  reservePrice: number;  
  bidIncrement: number;           

  inventoryauctionStatusCode?: string | null; 
  inventoryauctionStatusName?: string | null; 

  // audit
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
