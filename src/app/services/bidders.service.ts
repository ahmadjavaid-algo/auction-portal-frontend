import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bidder,BidderStats } from '../models/bidder.model';
import { AuthService } from '../services/auth'; // AuthService sits at src/app/services/auth.ts

// If you set up an Angular proxy: const API_BASE = '/api';
// Otherwise, point this to your swagger origin: e.g. 'http://localhost:5070/api'
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class BiddersService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Bidders`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );
  }

  getList(): Observable<Bidder[]> {
    return this.http.get<Bidder[]>(`${this.base}/getlist`, {
      headers: this.authHeaders(),
    });
  }
  getById(userId: number): Observable<Bidder> {
    const params = new HttpParams().set('UserId', userId);
    return this.http.get<Bidder>(`${this.base}/get`, {
      headers: this.authHeaders(),
      params,
    });
  }
  addUser(model: Bidder): Observable<number> {
    // API expects POST /Users/add returning new UserId (int)
    return this.http.post<number>(`${this.base}/add`, model, { headers: this.authHeaders() });
  }

  updateUser(model: Bidder): Observable<boolean> {
    // API expects PUT /Users/update returning boolean
    return this.http.put<boolean>(`${this.base}/update`, model, { headers: this.authHeaders() });
  }
  // ...existing imports & class omitted for brevity

activateUser(model: Pick<Bidder, 'userId' | 'active' | 'modifiedById'>): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, model, {
    headers: this.authHeaders(),
  });
}
  getStats(): Observable<BidderStats> {
    return this.http.get<BidderStats>(`${this.base}/getstats`, {
      headers: this.authHeaders(),
    });
  }
}
