import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BidderAuthService } from '../../../../../services/bidderauth';

@Component({
  selector: 'app-bidders-resetpassword',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './bidders-resetpassword.html',
  styleUrls: ['./bidders-resetpassword.scss']
})
export class BiddersResetpassword {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(BidderAuthService);

  loading = false;
  error: string | null = null;
  success = false;

  form = this.fb.group({
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required, Validators.minLength(6)]],
    code: [''] 
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const email = q.get('email') ?? '';
    const codeRaw = q.get('code') ?? '';
    const code = decodeURIComponent(codeRaw);

    if (!email || !code) {
      this.error = 'Invalid or missing reset link.';
      return;
    }

    this.form.patchValue({ email, code });
  }

  get f() { return this.form.controls; }

  async submit(): Promise<void> {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.password !== v.confirm) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.auth.resetPassword(String(v.email ?? ''), String(v.password ?? ''), String(v.code ?? '')).subscribe({
      next: (ok) => {
        this.loading = false;
        if (ok) {
          this.success = true;
          setTimeout(() => this.router.navigate(['/bidder/login']), 1500);
        } else {
          this.error = 'Reset failed. Your link may be expired or already used.';
        }
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message || 'Reset failed. Please try again.';
      }
    });
  }
}
