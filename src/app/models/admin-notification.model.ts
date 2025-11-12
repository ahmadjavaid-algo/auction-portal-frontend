
export interface AdminNotificationDto {
  adminNotificationId: number;

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

  affectedUserId?: number | null;
  auctionId?: number | null;
  inventoryAuctionId?: number | null;
}
