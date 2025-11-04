// favourite.model.ts
export interface Favourite {
  // db key
  bidderInventoryAuctionFavoriteId?: number | null;

  // foreign keys
  userId?: number | null;
  inventoryAuctionId: number;

  // audit
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

  // (optional extra fields if you ever read favourites
  // together with inventory-auction data)
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
