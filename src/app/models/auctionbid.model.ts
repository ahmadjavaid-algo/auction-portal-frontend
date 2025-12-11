
export interface AuctionBid {
  auctionBidId: number;

  auctionId: number;
  auctionBidStatusId: number;
  inventoryAuctionId: number;
  bidAmount: number;
  auctionBidStatusName?: string | null;

  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean | null;
  isAutoBid?: boolean | null;      
  autoBidAmount?: number | null;  
}
