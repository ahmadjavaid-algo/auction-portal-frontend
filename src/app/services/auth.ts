// services/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest
} from '../models/application-user-operation';
import { Observable, tap, throwError } from 'rxjs';

const TOKEN_KEY = 'ap_token';
const USER_KEY  = 'ap_user';

const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/ApplicationUserOperations`;

  login(userOrEmail: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = {
      userName: userOrEmail,
      passwordHash: password
    };

    return this.http.post<LoginResponse>(`${this.base}/login`, body).pipe(
      tap(resp => {
        if (resp?.success && resp.token) {
          localStorage.setItem(TOKEN_KEY, resp.token);
          localStorage.setItem(
            USER_KEY,
            JSON.stringify({
              userId: resp.userId,
              userName: resp.userName,
              firstName: resp.firstName,
              email: resp.email,
              permissions: resp.permissions ?? []
            })
          );
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get currentUser():
    | { userId: number; userName: string; firstName: string; email: string; permissions: string[] }
    | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private isTokenExpired(): boolean {
    const token = this.token;
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payloadB64 = parts[1];
      const payload = JSON.parse(atob(payloadB64));
      const exp: number | undefined = payload && payload.exp;
      if (!exp) return true;
      const now = Math.floor(Date.now() / 1000);
      return exp <= now;
    } catch {
      return true;
    }
  }

  get isAuthenticated(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  forgotPassword(email: string): Observable<boolean> {
    const body: ForgotPasswordRequest = { email };
    return this.http.post<boolean>(`${this.base}/forgotpassword`, body);
  }

  resetPassword(email: string, newPassword: string, code: string): Observable<boolean> {
    const body: ResetPasswordRequest = {
      email,
      newPasswordHash: newPassword,
      resetCode: code
    };
    return this.http.post<boolean>(`${this.base}/resetpassword`, body);
  }

  // NEW – call /api/ApplicationUserOperations/changepassword
  changePassword(oldPassword: string, newPassword: string): Observable<boolean> {
    const user = this.currentUser;
    if (!user) {
      return throwError(() => new Error('User not authenticated.'));
    }

    const body: ChangePasswordRequest = {
      userId: user.userId,
      oldPasswordHash: oldPassword,
      newPasswordHash: newPassword
    };

    return this.http.post<boolean>(`${this.base}/changepassword`, body);
  }
}
