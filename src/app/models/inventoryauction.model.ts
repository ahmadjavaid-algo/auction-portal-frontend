export interface InventoryAuction {
  inventoryAuctionId: number;
  inventoryAuctionStatusId: number;
  inventoryId: number;
  auctionId: number;

  buyNowPrice: number;
  reservePrice: number;
  bidIncrement: number;
  auctionStartPrice: number;
  inventoryAuctionStatusCode?: string | null;
  inventoryAuctionStatusName?: string | null;

  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
