
export interface Bidder {
  // Columns
  userId: number;
  userName: string;
  firstName: string;
  lastName?: string | null;
  identificationNumber?: string | null;
  address1?: string | null;
  postalCode?: string | null;
  email: string;
  emailConfirmed: boolean;
  passwordHash?: string | null;
  securityStamp?: string | null;
  phoneNumber?: string | null;
  loginDate?: string | null;   
  code?: string | null;

  // Audit
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
export interface BidderStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}
