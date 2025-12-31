import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-users-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './users-login.html',
  styleUrls: ['./users-login.scss']
})
export class UsersLogin implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);

  currentYear = new Date().getFullYear();

  email = '';
  password = '';
  rememberMe = false;
  loading = false;
  error: string | null = null;
  showPassword = false;

  private particlesInterval?: any;

  ngOnInit(): void {
    this.initializeParticles();
  }

  ngOnDestroy(): void {
    if (this.particlesInterval) {
      clearInterval(this.particlesInterval);
    }
  }

  private initializeParticles(): void {
    // Particle animation handled by CSS
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

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
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.error = resp?.message ?? 'Invalid credentials.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  clearError(): void {
    this.error = null;
  }
}
