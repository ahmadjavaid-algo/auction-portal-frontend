import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Product } from '../../../../models/product.model';

export type AddToInventoryResult = {
  chassisNo: string | null;
  registrationNo: string | null;
};

@Component({
  selector: 'app-add-to-inventory-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './add-to-inventory.dialog.html',
  styleUrls: ['./add-to-inventory.dialog.scss']
})
export class AddToInventoryDialog implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<AddToInventoryDialog, AddToInventoryResult>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      chassisNo: ['', [Validators.maxLength(64)]],
      registrationNo: ['', [Validators.maxLength(64)]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const chassis = (v.chassisNo || '').trim() || null;
    const reg = (v.registrationNo || '').trim() || null;

    this.ref.close({
      chassisNo: chassis,
      registrationNo: reg
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
