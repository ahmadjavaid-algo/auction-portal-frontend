import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AdminNotificationDto } from '../models/admin-notification.model';
import { AuthService } from './auth';

const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class AdminNotificationsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  // matches AdminNotificationsController route
  private base = `${API_BASE}/AdminNotifications`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  /** Get admin notifications (global list; respects unread/active server rules). */
  getAll(): Observable<AdminNotificationDto[]> {
    return this.http.get<AdminNotificationDto[]>(`${this.base}/list`, {
      headers: this.authHeaders()
    });
  }

  /** NEW: Get full admin notification history (even if cleared/read). */
  getHistory(top = 200): Observable<AdminNotificationDto[]> {
    return this.http.get<AdminNotificationDto[]>(
      `${this.base}/history?top=${encodeURIComponent(top)}`,
      { headers: this.authHeaders() }
    );
  }

  /** Mark all admin notifications as read. */
  markAllRead(): Observable<AdminNotificationDto[]> {
    return this.http.post<AdminNotificationDto[]>(
      `${this.base}/mark-all-read`,
      {},
      { headers: this.authHeaders() }
    );
  }

  /** Clear (soft delete) all admin notifications. */
  clearAll(): Observable<AdminNotificationDto[]> {
    return this.http.post<AdminNotificationDto[]>(
      `${this.base}/clear-all`,
      {},
      { headers: this.authHeaders() }
    );
  }
}
