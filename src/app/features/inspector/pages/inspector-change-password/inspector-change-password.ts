import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { InspectorAuthService } from '../../../../services/inspectorauth';

@Component({
  selector: 'app-inspector-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSnackBarModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './inspector-change-password.html',
  styleUrl: './inspector-change-password.scss'
})
export class InspectorChangePassword implements OnInit, AfterViewInit, OnDestroy {
  private auth = inject(InspectorAuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  private io?: IntersectionObserver;
  private observedEls = new WeakSet<Element>();

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    this.initScrollAnimations();
    this.observeAnimatedElements();
  }

  ngOnDestroy(): void {
    try {
      this.io?.disconnect();
    } catch {}
  }

  private initScrollAnimations(): void {
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            try {
              this.io?.unobserve(entry.target);
            } catch {}
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );
  }

  private observeAnimatedElements(): void {
    if (!this.io) return;

    const root: HTMLElement = this.elementRef.nativeElement as HTMLElement;
    const elements = root.querySelectorAll('.animate-on-scroll');

    elements.forEach((el: Element) => {
      if (this.observedEls.has(el)) return;
      this.observedEls.add(el);
      try {
        this.io!.observe(el);
      } catch {}
    });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    switch (field) {
      case 'current':
        this.showCurrentPassword = !this.showCurrentPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }

  submit(form: NgForm): void {
    if (form.invalid) {
      this.snack.open('Please fill all fields correctly.', 'OK', { duration: 2500 });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.snack.open('New password and confirmation do not match.', 'OK', { duration: 3000 });
      return;
    }

    if (this.newPassword.length < 6) {
      this.snack.open('New password must be at least 6 characters long.', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: ok => {
        if (ok) {
          this.snack.open('Password changed successfully!', 'OK', { duration: 3000 });
          this.router.navigate(['/inspector/accdetails']);
        } else {
          this.snack.open('Could not change password. Please try again.', 'OK', { duration: 4000 });
          this.saving = false;
        }
      },
      error: err => {
        const msg =
          err && err.error
            ? typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error)
            : 'Failed to change password. Please check your current password.';
        this.snack.open(msg, 'OK', { duration: 5000 });
        this.saving = false;
      },
      complete: () => {
        if (!this.saving) {
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          form.resetForm();
        }
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/inspector/accdetails']);
  }
}