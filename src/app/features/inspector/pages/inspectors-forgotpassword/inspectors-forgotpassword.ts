import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth';
import { InspectorAuthService } from '../../../../services/inspectorauth';

@Component({
  selector: 'app-inspectors-forgotpassword',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inspectors-forgotpassword.html',
  styleUrl: './inspectors-forgotpassword.scss'
})
export class InspectorsForgotpassword {
  private auth = inject(InspectorAuthService);
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
    this.router.navigate(['/inspector/login']);
  }
}
