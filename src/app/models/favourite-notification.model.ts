
export interface FavouriteNotification {
  favouriteId: number;
  userId: number;
  inventoryAuctionId: number;
  auctionId: number;
  title: string;
  startEpochMsUtc?: number | null;
  endEpochMsUtc?: number | null;
}
