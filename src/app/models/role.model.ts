export interface Role {
  roleId: number;
  roleName: string;
  roleCode: string;
  description?: string | null;

  // audit (optional on the wire)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}
export interface RoleStats {
  totalRoles: number;
  activeRoles: number;
  inactiveRoles: number;
}

