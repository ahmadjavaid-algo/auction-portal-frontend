
export interface Favourite {
  
  bidderInventoryAuctionFavoriteId?: number | null;

  
  userId?: number | null;
  inventoryAuctionId: number;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

  
  
  inventoryAuctionStatusId?: number;
  inventoryId?: number;
  auctionId?: number;
  buyNowPrice?: number;
  reservePrice?: number;
  bidIncrement?: number;
  auctionStartPrice?: number;
  inventoryAuctionStatusCode?: string | null;
  inventoryAuctionStatusName?: string | null;
}
