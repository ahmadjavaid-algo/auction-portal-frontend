import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BidderAuthService } from '../../../../../services/bidderauth';

@Component({
  selector: 'app-users-forgotpassword',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bidders-forgotpassword.html',
  styleUrls: ['./bidders-forgotpassword.scss']
})
export class BiddersForgotpassword {
  private auth = inject(BidderAuthService);
  private router = inject(Router);

  currentYear = new Date().getFullYear();

  email = '';
  loading = false;
  sent = false;              
  error: string | null = null;

  submit(): void {
    this.error = null;

    const addr = this.email.trim();
    if (!addr) {
      this.error = 'Please enter the email associated with your account.';
      return;
    }

    this.loading = true;
    this.auth.forgotPassword(addr).subscribe({
      next: () => {
        this.sent = true;
        this.loading = false;
      },
      error: () => {
        this.sent = true;
        this.loading = false;
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/bidder/login']);
  }
}
