// notification.model.ts
export interface NotificationDto {
  notificationId: number;
  userId: number;

  /** e.g. "favourite-added", "favourite-deactivated" */
  type: string;

  title: string;
  message: string;

  isRead: boolean;
  readDate?: string | null;

  // audit (coming from BaseModel)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean | null;
}
