export interface Model {
  makeId: number;
  modelId: number;
  modelName: string;

  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;

}