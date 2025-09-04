/** One claim row (from /api/RoleClaims/list or /byrole) */
export interface RoleClaim {
  roleId?: number;                // present in byrole results (optional)
  claimId: number;
  claimCode: string;
  endpoint: string;
  description?: string | null;
  claimGroupId?: number | null;
}

/** UI view-model with selection state */
export interface RoleClaimSelection extends RoleClaim {
  selected: boolean;
}
