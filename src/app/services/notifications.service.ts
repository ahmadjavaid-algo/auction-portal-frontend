// notifications.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { NotificationDto } from '../models/notification.model';
import { BidderAuthService } from './bidderauth';

const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private auth = inject(BidderAuthService);

  private base = `${API_BASE}/Notifications`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  /** Load all notifications for the currently logged-in user (from JWT). */
  getForCurrentUser(): Observable<NotificationDto[]> {
    // matches [HttpGet("list")] in NotificationsController
    return this.http.get<NotificationDto[]>(
      `${this.base}/list`,
      { headers: this.authHeaders() }
    );
  }

  /** Mark all notifications as read for the current user. */
  markAllRead(): Observable<NotificationDto[]> {
    // matches [HttpPost("mark-all-read")]
    return this.http.post<NotificationDto[]>(
      `${this.base}/mark-all-read`,
      {}, // body
      { headers: this.authHeaders() }
    );
  }

  /** Clear all notifications for the current user. */
  clearAll(): Observable<NotificationDto[]> {
    // matches [HttpPost("clear-all")]
    return this.http.post<NotificationDto[]>(
      `${this.base}/clear-all`,
      {}, // body
      { headers: this.authHeaders() }
    );
  }
}
