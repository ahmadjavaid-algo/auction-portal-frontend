// src/app/features/bidder-portal/bidder/pages/bidder-change-password/bidder-change-password.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { BidderAuthService } from '../../../../../services/bidderauth';

type StrengthLevel = 'weak' | 'ok' | 'strong' | 'elite';

@Component({
  selector: 'app-bidder-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatSnackBarModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './bidder-change-password.html',
  styleUrls: ['./bidder-change-password.scss']
})
export class BidderChangePassword implements AfterViewInit, OnDestroy {
  private auth = inject(BidderAuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  @ViewChild('ritual', { static: false }) ritual?: ElementRef<HTMLElement>;

  // Form model
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;

  // UI states
  revealReady = false;
  capsOn = false;

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  private io?: IntersectionObserver;

  // ─────────────────────────────────────────────────────────────────────────────
  // Ritual / Strength model
  // ─────────────────────────────────────────────────────────────────────────────

  private hasLower(s: string) {
    return /[a-z]/.test(s);
  }
  private hasUpper(s: string) {
    return /[A-Z]/.test(s);
  }
  private hasDigit(s: string) {
    return /\d/.test(s);
  }
  private hasSymbol(s: string) {
    return /[^A-Za-z0-9]/.test(s);
  }
  private noSpaces(s: string) {
    return !/\s/.test(s);
  }

  get match(): boolean {
    return !!this.newPassword && this.newPassword === this.confirmPassword;
  }

  get differentFromCurrent(): boolean {
    if (!this.currentPassword || !this.newPassword) return true;
    return this.currentPassword !== this.newPassword;
  }

  get strengthScore(): number {
    const p = this.newPassword || '';
    if (!p) return 0;

    let score = 0;

    // length (weighted)
    if (p.length >= 8) score += 18;
    if (p.length >= 12) score += 22;
    if (p.length >= 16) score += 10;

    // composition
    if (this.hasLower(p)) score += 10;
    if (this.hasUpper(p)) score += 10;
    if (this.hasDigit(p)) score += 12;
    if (this.hasSymbol(p)) score += 14;

    // hygiene
    if (this.noSpaces(p)) score += 8;

    // avoid re-use
    if (this.differentFromCurrent && this.currentPassword) score += 6;

    // confirmation adds confidence (but not required to type)
    if (this.match && this.confirmPassword) score += 8;

    // cap
    return Math.max(0, Math.min(100, score));
  }

  get strengthLevel(): StrengthLevel {
    const s = this.strengthScore;
    if (s >= 85) return 'elite';
    if (s >= 65) return 'strong';
    if (s >= 40) return 'ok';
    return 'weak';
  }

  get strengthLabel(): string {
    switch (this.strengthLevel) {
      case 'elite':
        return 'Elite';
      case 'strong':
        return 'Strong';
      case 'ok':
        return 'Okay';
      default:
        return 'Weak';
    }
  }

  get strengthIcon(): string {
    switch (this.strengthLevel) {
      case 'elite':
        return 'verified';
      case 'strong':
        return 'lock';
      case 'ok':
        return 'shield';
      default:
        return 'warning';
    }
  }

  get canSubmit(): boolean {
    if (this.saving) return false;
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) return false;
    if (!this.match) return false;
    if (!this.noSpaces(this.newPassword)) return false;
    if (!this.differentFromCurrent) return false;
    // baseline bar (keeps it “procedural” without being scary)
    if (this.strengthScore < 40) return false;
    return true;
  }

  get checklist() {
    const p = this.newPassword || '';
    return [
      { ok: p.length >= 12, label: '12+ characters (recommended)' },
      { ok: p.length >= 8, label: 'At least 8 characters' },
      { ok: this.hasLower(p), label: 'Lowercase letter' },
      { ok: this.hasUpper(p), label: 'Uppercase letter' },
      { ok: this.hasDigit(p), label: 'Number' },
      { ok: this.hasSymbol(p), label: 'Symbol' },
      { ok: this.noSpaces(p), label: 'No spaces' },
      {
        ok: this.differentFromCurrent,
        label: 'Different from current password'
      },
      {
        ok: !this.confirmPassword ? true : this.match,
        label: 'Confirmation matches'
      }
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scroll / reveal behavior (auctions-list rhythm)
  // ─────────────────────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    // Stage class to let CSS run orchestrated “hero → content” reveal
    requestAnimationFrame(() => (this.revealReady = true));

    // Intersection-driven reveals (keeps it award-feel without extra libs)
    const nodes = document.querySelectorAll('.reveal') as NodeListOf<HTMLElement>;
    this.io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in');
          }
        });
      },
      { root: null, threshold: 0.16, rootMargin: '0px 0px -10% 0px' }
    );
    nodes.forEach(n => this.io?.observe(n));
  }

  ngOnDestroy(): void {
    if (this.io) this.io.disconnect();
  }

  scrollToRitual(): void {
    const el = this.ritual?.nativeElement;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onKeyState(ev: KeyboardEvent): void {
    // “CapsLock” awareness without drama
    try {
      this.capsOn = !!ev.getModifierState && ev.getModifierState('CapsLock');
    } catch {
      this.capsOn = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Submit / cancel
  // ─────────────────────────────────────────────────────────────────────────────

  submit(form: NgForm): void {
    if (form.invalid) {
      this.snack.open('Complete all fields to proceed.', 'OK', { duration: 2500 });
      return;
    }

    if (!this.match) {
      this.snack.open('Confirmation does not match.', 'OK', { duration: 3000 });
      return;
    }

    if (!this.noSpaces(this.newPassword)) {
      this.snack.open('Password cannot contain spaces.', 'OK', { duration: 3000 });
      return;
    }

    if (!this.differentFromCurrent) {
      this.snack.open('New password must be different from current.', 'OK', {
        duration: 3500
      });
      return;
    }

    if (this.strengthScore < 40) {
      this.snack.open('Choose a stronger password to continue.', 'OK', {
        duration: 3500
      });
      return;
    }

    this.saving = true;

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: ok => {
        if (ok) {
          this.snack.open('Security updated. Password changed successfully.', 'OK', {
            duration: 3000
          });
          this.router.navigate(['/bidder/accdetails']);
        } else {
          this.snack.open('Could not change password.', 'OK', { duration: 4000 });
        }
      },
      error: err => {
        const msg =
          err && (err as any).error
            ? typeof (err as any).error === 'string'
              ? (err as any).error
              : JSON.stringify((err as any).error)
            : 'Failed to change password.';
        this.snack.open(msg, 'OK', { duration: 5000 });
      },
      complete: () => {
        this.saving = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.capsOn = false;
        form.resetForm();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/bidder/accdetails']);
  }
}
