export interface AuctionTimebox {
  auctionId: number;

  startEpochMsUtc: number;
  endEpochMsUtc: number;
  nowEpochMsUtc: number;

  auctionStatusId: number;
  auctionStatusCode: string;
  auctionStatusName: string;
}
