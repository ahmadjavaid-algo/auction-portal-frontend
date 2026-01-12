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

import { Product } from '../../../../models/product.model';
import { Make } from '../../../../models/make.model';
import { Model } from '../../../../models/model.model';
import { Year } from '../../../../models/year.model';
import { Category } from '../../../../models/category.model';

import { MakesService } from '../../../../services/makes.service';
import { ModelsService } from '../../../../services/models.service';
import { YearsService } from '../../../../services/years.service';
import { CategorysService } from '../../../../services/categories.service';
import { AuthService } from '../../../../services/auth';

type Mode = 'create' | 'edit';

export type ProductFormResult =
  | { action: 'create'; payload: Product }
  | { action: 'edit'; payload: Product };

@Component({
  selector: 'app-products-form',
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
  templateUrl: './products-form.html',
  styleUrls: ['./products-form.scss']
})
export class ProductsForm implements OnInit, AfterViewInit {
  form!: FormGroup;
  mode: Mode;

  makes: Make[] = [];
  modelsAll: Model[] = [];
  modelsFiltered: Model[] = [];
  years: Year[] = [];
  categories: Category[] = [];

  loadingMakes = false;
  loadingModels = false;
  loadingYears = false;
  loadingCategories = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductsForm, ProductFormResult>,
    private auth: AuthService,
    private makesSvc: MakesService,
    private modelsSvc: ModelsService,
    private yearsSvc: YearsService,
    private categoriesSvc: CategorysService,
    @Inject(MAT_DIALOG_DATA) public data: { mode: Mode; initialData?: Product | null }
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      productId: [0],

      displayName: ['', [Validators.required, Validators.maxLength(150), this.noWhitespaceValidator]],
      makeId: [null, [Validators.required]],
      modelId: [null, [Validators.required]],
      yearId: [null, [Validators.required]],
      categoryId: [null, [Validators.required]]
    });

    // Load dropdowns
    this.loadMakes();
    this.loadModels();
    this.loadYears();
    this.loadCategories();

    // Filter models by make
    this.form.get('makeId')!.valueChanges.subscribe((makeId: number | null) => {
      this.filterModels(makeId);

      const currentModelId = this.form.get('modelId')!.value;
      if (currentModelId && !this.modelsFiltered.some(m => (m as any).modelId === currentModelId)) {
        this.form.get('modelId')!.setValue(null);
      }
    });

    // Patch edit data
    if (this.mode === 'edit' && this.data.initialData) {
      const r = this.data.initialData;
      this.form.patchValue({
        productId: r.productId,
        displayName: r.displayName ?? '',
        makeId: r.makeId ?? null,
        modelId: r.modelId ?? null,
        yearId: r.yearId ?? null,
        categoryId: r.categoryId ?? null
      });

      this.filterModels(r.makeId ?? null);
    }
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

  private noWhitespaceValidator(control: AbstractControl): { [key: string]: any } | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return !isWhitespace ? null : { whitespace: true };
  }

  private loadMakes(): void {
    this.loadingMakes = true;
    this.makesSvc.getList().subscribe({
      next: (list) => {
        this.makes = [...(list ?? [])].sort((a, b) => (a.makeName ?? '').localeCompare(b.makeName ?? ''));
      },
      error: () => (this.makes = []),
      complete: () => (this.loadingMakes = false)
    });
  }

  private loadModels(): void {
    this.loadingModels = true;
    this.modelsSvc.getList().subscribe({
      next: (list) => {
        this.modelsAll = [...(list ?? [])].sort((a, b) => (a.modelName ?? '').localeCompare(b.modelName ?? ''));

        const makeId = this.form?.get('makeId')?.value ?? null;
        this.filterModels(makeId);
      },
      error: () => {
        this.modelsAll = [];
        this.modelsFiltered = [];
      },
      complete: () => (this.loadingModels = false)
    });
  }

  private loadYears(): void {
    this.loadingYears = true;
    this.yearsSvc.getList().subscribe({
      next: (list) => {
        this.years = [...(list ?? [])].sort((a, b) => (a.yearName ?? '').localeCompare(b.yearName ?? ''));
      },
      error: () => (this.years = []),
      complete: () => (this.loadingYears = false)
    });
  }

  private loadCategories(): void {
    this.loadingCategories = true;
    this.categoriesSvc.getList().subscribe({
      next: (list) => {
        this.categories = [...(list ?? [])].sort((a, b) => (a.categoryName ?? '').localeCompare(b.categoryName ?? ''));
      },
      error: () => (this.categories = []),
      complete: () => (this.loadingCategories = false)
    });
  }

  private filterModels(makeId: number | null): void {
    if (!makeId) {
      this.modelsFiltered = this.modelsAll.slice();
      return;
    }
    this.modelsFiltered = this.modelsAll.filter((m: any) => m.makeId === makeId);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const currentUserId = this.auth.currentUser?.userId ?? null;

    const payload: Product = {
      productId: v.productId,
      displayName: v.displayName?.trim(),
      makeId: v.makeId,
      modelId: v.modelId,
      yearId: v.yearId,
      categoryId: v.categoryId,

      createdById: this.mode === 'create' ? currentUserId : null,
      createdDate: null,
      modifiedById: currentUserId ?? null,
      modifiedDate: null
    } as Product;

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
    return this.mode === 'edit' ? 'Edit Product' : 'Create New Product';
  }

  get submitButtonText(): string {
    return this.mode === 'edit' ? 'Update Product' : 'Create Product';
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
}
