export interface Auction {
  auctionId: number;
  auctionStatusId: number;
  auctionName: string;

  startDateTime: string | null;   
  endDateTime: string | null;     
  bidIncrement: number;           

  auctionStatusCode?: string | null; 
  auctionStatusName?: string | null; 

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
