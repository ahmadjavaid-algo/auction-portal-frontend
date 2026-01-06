import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-admin-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './admin-change-password.html',
  styleUrls: ['./admin-change-password.scss']
})
export class AdminChangePassword implements OnInit, AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  // Reveal-on-scroll (same behavior as your list pages)
  private intersectionObserver?: IntersectionObserver;
  @ViewChild('pageRoot', { static: false }) pageRoot?: ElementRef<HTMLElement>;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private initScrollReveal(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const els = document.querySelectorAll('.reveal-on-scroll');
      els.forEach((el) => this.intersectionObserver?.observe(el));
    }, 80);
  }

  // -------------------------
  // Password rules + strength
  // -------------------------
  get ruleMinLen(): boolean {
    return (this.newPassword || '').length >= 8;
  }
  get ruleLower(): boolean {
    return /[a-z]/.test(this.newPassword || '');
  }
  get ruleUpper(): boolean {
    return /[A-Z]/.test(this.newPassword || '');
  }
  get ruleNumber(): boolean {
    return /\d/.test(this.newPassword || '');
  }
  get ruleSpecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.newPassword || '');
  }

  get rulesMetCount(): number {
    return [this.ruleMinLen, this.ruleLower, this.ruleUpper, this.ruleNumber, this.ruleSpecial].filter(Boolean).length;
  }

  get strengthPercent(): number {
    // 0..100 based on 5 rules
    return Math.round((this.rulesMetCount / 5) * 100);
  }

  get strengthLabel(): string {
    const p = this.strengthPercent;
    if (!this.newPassword) return '—';
    if (p <= 20) return 'Very weak';
    if (p <= 40) return 'Weak';
    if (p <= 60) return 'Fair';
    if (p <= 80) return 'Strong';
    return 'Excellent';
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) return false;
    if (this.newPassword !== this.confirmPassword) return false;
    // require at least 4/5 rules (feels premium but not annoying)
    return this.rulesMetCount >= 4;
  }

  submit(form: NgForm): void {
    if (form.invalid) {
      this.snack.open('Please fill all fields.', 'OK', { duration: 2500 });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.snack.open('New password and confirmation do not match.', 'OK', { duration: 3000 });
      return;
    }

    if (this.rulesMetCount < 4) {
      this.snack.open('Please choose a stronger password (meet at least 4 requirements).', 'OK', {
        duration: 3500
      });
      return;
    }

    this.saving = true;

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (ok) => {
        if (ok) {
          this.snack.open('Password changed successfully.', 'OK', { duration: 3000 });
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.snack.open('Could not change password.', 'OK', { duration: 4000 });
        }
      },
      error: (err) => {
        const msg =
          err && err.error
            ? typeof err.error === 'string'
              ? err.error
              : (err.error?.message ?? JSON.stringify(err.error))
            : 'Failed to change password.';
        this.snack.open(msg, 'OK', { duration: 5000 });
      },
      complete: () => {
        this.saving = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        form.resetForm();
        this.showCurrent = this.showNew = this.showConfirm = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
