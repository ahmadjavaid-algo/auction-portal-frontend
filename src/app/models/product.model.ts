export interface Product {
  yearId: number;
  categoryId: number;
  makeId: number;
  modelId: number;
  productId: number;
  displayName: string;
  modelName: string;
  makeName: string;
  yearName: string;
  // audit (optional on the wire)
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}