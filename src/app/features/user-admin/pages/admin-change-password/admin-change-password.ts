import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-admin-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './admin-change-password.html',
  styleUrls: ['./admin-change-password.scss']
})
export class AdminChangePassword {
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saving = false;

  submit(form: NgForm): void {
    if (form.invalid) {
      this.snack.open('Please fill all fields.', 'OK', { duration: 2500 });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.snack.open('New password and confirmation do not match.', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: ok => {
        if (ok) {
          this.snack.open('Password changed successfully.', 'OK', { duration: 3000 });
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.snack.open('Could not change password.', 'OK', { duration: 4000 });
        }
      },
      error: err => {
        const msg =
          err && err.error
            ? typeof err.error === 'string'
              ? err.error
              : JSON.stringify(err.error)
            : 'Failed to change password.';
        this.snack.open(msg, 'OK', { duration: 5000 });
      },
      complete: () => {
        this.saving = false;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        form.resetForm();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
