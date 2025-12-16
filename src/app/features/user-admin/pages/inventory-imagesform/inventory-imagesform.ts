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

  get inventoryId(): number {
    return this.data?.inventoryId ?? 0;
  }

  uploading = false;
  files: UploadItem[] = [];

  
  
  documentTypes = [
    { id: 1, name: 'Inventory Images' }
  ];

  
  imageAccept = '.jpg,.jpeg,.png';

  form = this.fb.group({
    documentTypeId: [1, Validators.required]
  });

  private isImageFile(file: File): boolean {
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
    return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
  }

  onFilesChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const list = Array.from(input?.files ?? []);

    if (!list.length) {
      this.files = [];
      return;
    }

    const accepted: UploadItem[] = [];
    const rejectedNames: string[] = [];

    for (const f of list) {
      if (this.isImageFile(f)) {
        accepted.push({ file: f, status: 'pending' });
      } else {
        rejectedNames.push(f.name);
      }
    }

    this.files = accepted;

    if (rejectedNames.length) {
      this.snack.open(
        `Only JPG/PNG images are allowed. Skipped: ${rejectedNames.join(', ')}`,
        'Dismiss',
        { duration: 4000 }
      );
    }
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
      this.snack.open('Please choose at least one image.', 'Dismiss', { duration: 2500 });
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

        
        let docFileId: number | undefined;
        try {
          docFileId = await this.docSvc
            .upload(item.file, {
              documentTypeId: documentTypeId!, 
              documentName: this.baseNameOf(item.file),
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
            item.message = 'Image saved, but linking failed.';
            failed++;
          }
        } catch (e: any) {
          item.status = 'failed';
          item.message = e?.error || 'Linking failed.';
          failed++;
        }
      }

      const summary =
        `${uploaded} image(s) uploaded (main + thumbnail), ` +
        `${linked} linked` +
        (failed ? `, ${failed} failed` : '');
      this.snack.open(summary, 'OK', { duration: 3500 });

      this.dialogRef.close({ uploaded, linked, failed, refresh: linked > 0 });
    } finally {
      this.uploading = false;
    }
  }
}
