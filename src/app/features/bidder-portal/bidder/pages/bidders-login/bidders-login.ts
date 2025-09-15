import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BidderAuthService } from '../../../../../services/bidderauth';

@Component({
  selector: 'app-bidders-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bidders-login.html',
  styleUrl: './bidders-login.scss'
})
export class BiddersLogin {
  private auth = inject(BidderAuthService);
  private router = inject(Router);
  currentYear = new Date().getFullYear();
  // bound to your template
  email = '';
  password = '';
  loading = false;
  error: string | null = null;

  async login(): Promise<void> {
    this.error = null;

    const userOrEmail = this.email?.trim();
    const pwd = this.password;

    if (!userOrEmail || !pwd) {
      this.error = 'Please enter both email/username and password.';
      return;
    }

    this.loading = true;
    this.auth.login(userOrEmail, pwd).subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp?.success) {
          
          this.router.navigate(['/bidder/dashboard']);
        } else {
          this.error = resp?.message ?? 'Invalid credentials.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = (err?.error?.message) || 'Login failed. Please try again.';
      }
    });
  }
}
