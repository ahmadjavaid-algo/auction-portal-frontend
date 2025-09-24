export interface Make {
  makeId: number;
  makeName: string;

  // audit (optional on the wire)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}