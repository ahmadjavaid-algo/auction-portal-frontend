export interface Auction {
  auctionId: number;
  auctionStatusId: number;
  auctionName: string;

  startDateTime: string | null;   // was startDate
  endDateTime: string | null;     // was endDate
  bidIncrement: number;           // was bidincrement

  auctionStatusCode?: string | null; // was auctionstatuscode
  auctionStatusName?: string | null; // was auctionstatusname

  // audit
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
