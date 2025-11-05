export interface Category {
  yearId: number;
  categoryId: number;
  categoryName: string;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}