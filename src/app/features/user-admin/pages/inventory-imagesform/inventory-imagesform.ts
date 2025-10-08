import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule }    from '@angular/material/select';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DocumentFileService } from '../../../../services/documentfile.service';
import { InventoryDocumentFileService } from '../../../../services/inventorydocumentfile.service';
import { AuthService } from '../../../../services/auth';

type UploadItem = {
  file: File;
  status: 'pending' | 'uploading' | 'linked' | 'failed';
  message?: string;
};

export type InventoryImagesDialogData = {
  inventoryId: number;
};

export type InventoryImagesDialogResult = {
  uploaded: number;
  linked: number;
  failed: number;
  refresh?: boolean;
};

@Component({
  selector: 'app-inventory-imagesform',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './inventory-imagesform.html',
  styleUrls: ['./inventory-imagesform.scss']
})
export class InventoryImagesform {
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private docSvc = inject(DocumentFileService);
  private invDocSvc = inject(InventoryDocumentFileService);

  constructor(
    private dialogRef: MatDialogRef<InventoryImagesform, InventoryImagesDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: InventoryImagesDialogData
  ) {}

  get inventoryId(): number { return this.data?.inventoryId ?? 0; }

  uploading = false;
  files: UploadItem[] = [];

  // Only two options, as requested
  documentTypes = [
    { id: 1, name: 'Inventory' },
    { id: 2, name: 'Auction' }
  ];

  form = this.fb.group({
    documentTypeId: [1, Validators.required]
  });

  onFilesChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const list = Array.from(input?.files ?? []);
    this.files = list.map(f => ({ file: f, status: 'pending' }));
  }

  private baseNameOf(file: File): string {
    return file.name.replace(/\.[^.]+$/, '');
  }

  close(): void {
    this.dialogRef.close();
  }

  async submit() {
    if (!this.inventoryId) {
      this.snack.open('No InventoryId found.', 'Dismiss', { duration: 2500 });
      return;
    }
    if (!this.files.length) {
      this.snack.open('Please choose at least one file.', 'Dismiss', { duration: 2500 });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { documentTypeId } = this.form.getRawValue();
    const createdById = this.auth.currentUser?.userId ?? null;

    let uploaded = 0;
    let linked = 0;
    let failed = 0;

    this.uploading = true;

    try {
      for (const item of this.files) {
        item.status = 'uploading';

        // 1) Upload file (multipart) → returns DocumentFileId
        let docFileId: number | undefined;
        try {
          docFileId = await this.docSvc
            .upload(item.file, {
              documentTypeId: documentTypeId!,
              documentName: this.baseNameOf(item.file),   // server “DocumentName”
              createdById
            })
            .toPromise();

          uploaded++;
        } catch (e: any) {
          item.status = 'failed';
          item.message = e?.error || 'Upload failed.';
          failed++;
          continue;
        }

        if (!docFileId || docFileId <= 0) {
          item.status = 'failed';
          item.message = 'Upload failed (no id returned).';
          failed++;
          continue;
        }

        // 2) Link file to Inventory — auto DisplayName = base filename
        try {
          const linkId = await this.invDocSvc
            .add({
              DocumentFileId: docFileId,
              InventoryId: this.inventoryId,
              DocumentDisplayName: this.baseNameOf(item.file),
              createdById
            } as any)
            .toPromise();

          if (linkId && linkId > 0) {
            item.status = 'linked';
            linked++;
          } else {
            item.status = 'failed';
            item.message = 'File saved, but linking failed.';
            failed++;
          }
        } catch (e: any) {
          item.status = 'failed';
          item.message = e?.error || 'Linking failed.';
          failed++;
        }
      }

      const summary = `${uploaded} uploaded, ${linked} linked` + (failed ? `, ${failed} failed` : '');
      this.snack.open(summary, 'OK', { duration: 3500 });

      // Close dialog, signal caller to refresh if anything linked
      this.dialogRef.close({ uploaded, linked, failed, refresh: linked > 0 });
    } finally {
      this.uploading = false;
    }
  }
}
