import { Component, Inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';

import { Inventory } from '../../../../models/inventory.model';
import { Product } from '../../../../models/product.model';
import { ProductsService } from '../../../../services/products.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type InventoryFormResult =
  | { action: 'create'; payload: Inventory }
  | { action: 'edit'; payload: Inventory };

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltip
  ],
  templateUrl: './inventory-form.html',
  styleUrls: ['./inventory-form.scss']
})
export class InventoryForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  products: Product[] = [];
  loadingProducts = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InventoryForm, InventoryFormResult>,
    private auth: AuthService,
    private productsSvc: ProductsService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Inventory | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      inventoryId: [0],

      productId: [null, [Validators.required]],
      description: ['', [Validators.maxLength(4000), this.optionalNoWhitespaceValidator]],

      chassisNo: ['', [Validators.maxLength(64), this.optionalNoWhitespaceValidator]],
      registrationNo: ['', [Validators.maxLength(64), this.optionalNoWhitespaceValidator]]
    });

    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        inventoryId: r.inventoryId,
        productId: r.productId ?? null,
        description: r.description ?? '',
        chassisNo: r.chassisNo ?? '',
        registrationNo: r.registrationNo ?? ''
      });
    }

    this.loadProducts();
  }

  ngAfterViewInit(): void {
    // Add staggered reveal animation to form fields (same as UsersForm)
    setTimeout(() => {
      const fields = document.querySelectorAll('.form-field');
      fields.forEach((field, index) => {
        (field as HTMLElement).style.animationDelay = `${index * 0.05}s`;
        field.classList.add('field-reveal');
      });
    }, 100);
  }

  private optionalNoWhitespaceValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;

    // allow null/undefined/empty string
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.length === 0) return null;

    const isWhitespaceOnly = String(value).trim().length === 0;
    return isWhitespaceOnly ? { whitespace: true } : null;
  }

  private loadProducts(): void {
    this.loadingProducts = true;
    this.productsSvc.getList().subscribe({
      next: (list) => {
        this.products = [...(list ?? [])].sort((a: any, b: any) =>
          (a?.displayName ?? '').localeCompare(b?.displayName ?? '')
        );

        // If edit mode has an existing productId, ensure it's still valid
        const selectedId = this.form?.get('productId')?.value ?? null;
        if (selectedId && !this.products.some(p => (p as any).productId === selectedId)) {
          this.form.patchValue({ productId: null }, { emitEvent: false });
        }
      },
      error: () => {
        this.products = [];
      },
      complete: () => (this.loadingProducts = false)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Inventory = {
      inventoryId: v.inventoryId,
      productId: v.productId,
      productJSON: '',

      description: (v.description ?? '').trim() || null,
      chassisNo: (v.chassisNo ?? '').trim() || null,
      registrationNo: (v.registrationNo ?? '').trim() || null,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
    } as Inventory;

    this.dialogRef.close(
      this.mode === 'create'
        ? { action: 'create', payload }
        : { action: 'edit', payload }
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Inventory' : 'Create New Inventory';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Inventory' : 'Create Inventory';
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('maxlength')) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Must not exceed ${maxLength} characters`;
    }
    if (control.hasError('whitespace')) return 'Cannot be only whitespace';

    return 'Invalid value';
  }

  productLabel(p: any): string {
    const name = p?.displayName ?? '';
    const cat = p?.categoryName ?? p?.categoryId ?? '';
    return cat ? `${name} • ${cat}` : name;
  }
}
