
export interface RoleClaim {
  roleId?: number;                
  claimId: number;
  claimCode: string;
  endpoint: string;
  description?: string | null;
  claimGroupId?: number | null;
}


export interface RoleClaimSelection extends RoleClaim {
  selected: boolean;
}
