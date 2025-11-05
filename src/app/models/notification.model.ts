
export interface NotificationDto {
  notificationId: number;
  userId: number;

  
  type: string;

  title: string;
  message: string;

  isRead: boolean;
  readDate?: string | null;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean | null;
  auctionId?: number | null;
  inventoryAuctionId?: number | null;
}
