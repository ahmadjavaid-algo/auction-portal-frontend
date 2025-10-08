export interface DocumentFile {
  DocumentFileId: number;
  DocumentTypeId: number;

  DocumentExtension?: string | null;
  DocumentTypeName?: string | null;
  DocumentUrl?: string | null;
  DocumentName: string;
  
  createdById?: number | null;
  createdDate?: string | null;
  modifiedById?: number | null;
  modifiedDate?: string | null;
  active?: boolean;
}
