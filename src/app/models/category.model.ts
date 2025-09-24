export interface Category {
  yearId: number;
  categoryId: number;
  categoryName: string;

  // audit (optional on the wire)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}