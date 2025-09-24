import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators, ReactiveFormsModule,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { BiddersService } from '../../../../../services/bidders.service';
import { Bidder } from '../../../../../models/bidder.model';

@Component({
  selector: 'app-bidders-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bidders-signup.html',
  styleUrls: ['./bidders-signup.scss']
})
export class BiddersSignup {
  form: FormGroup;
  loading = false;
  error = '';
  success = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private biddersSvc: BiddersService
  ) {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        userName: ['', [Validators.required, Validators.maxLength(100)]],
        firstName: ['', [Validators.required, Validators.maxLength(100)]],
        lastName: [''],

        phoneNumber: [''],
        identificationNumber: [''],
        address1: [''],
        postalCode: [''],

        // keep the name "passwordHash" to match your backend contract
        passwordHash: ['', [Validators.required, Validators.minLength(6)]],
        confirm: ['', [Validators.required]],

        acceptTerms: [false, [Validators.requiredTrue]]
      },
      { validators: this.match('passwordHash', 'confirm') }
    );
  }


  get f(): Record<string, AbstractControl> {
    return this.form.controls as Record<string, AbstractControl>;
  }


  private match(a: string, b: string) {
    return (g: AbstractControl): ValidationErrors | null => {
      const va = g.get(a)?.value;
      const vb = g.get(b)?.value;
      if (va && vb && va !== vb) {
        g.get(b)?.setErrors({ mismatch: true });
        return { mismatch: true };
      }
      return null;
    };
  }

  submit() {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload: Bidder = {
      userId: 0,
      userName: v.userName?.trim(),
      firstName: v.firstName?.trim(),
      lastName: v.lastName?.trim() || null,
      identificationNumber: v.identificationNumber?.trim() || null,
      address1: v.address1?.trim() || null,
      postalCode: v.postalCode?.trim() || null,
      email: v.email?.trim(),
      emailConfirmed: false,                 
      passwordHash: v.passwordHash,  
      phoneNumber: v.phoneNumber?.trim() || null,
      active: true
    };

    this.loading = true;
    this.biddersSvc.addUser(payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.router.navigate(['/bidder/login']);
      },
      error: (e) => {
        this.loading = false;
        this.error =
          e?.error?.message ||
          e?.error?.title ||
          e?.error?.detail ||
          'Failed to create account.';
        console.error('Signup failed:', e?.error || e);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/bidder/login']);
  }
}
