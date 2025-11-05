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

  
  getForCurrentUser(): Observable<NotificationDto[]> {
    
    return this.http.get<NotificationDto[]>(
      `${this.base}/list`,
      { headers: this.authHeaders() }
    );
  }

  
  markAllRead(): Observable<NotificationDto[]> {
    
    return this.http.post<NotificationDto[]>(
      `${this.base}/mark-all-read`,
      {}, 
      { headers: this.authHeaders() }
    );
  }

  
  clearAll(): Observable<NotificationDto[]> {
    
    return this.http.post<NotificationDto[]>(
      `${this.base}/clear-all`,
      {}, 
      { headers: this.authHeaders() }
    );
  }
}
