import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bidder,BidderStats } from '../models/bidder.model';
import { BidderAuthService } from '../services/bidderauth'; 



const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class BiddersService {
  private http = inject(HttpClient);
  private auth = inject(BidderAuthService);
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
    
    return this.http.post<number>(`${this.base}/add`, model, { headers: this.authHeaders() });
  }

  updateUser(model: Bidder): Observable<boolean> {
    
    return this.http.put<boolean>(`${this.base}/update`, model, { headers: this.authHeaders() });
  }
  

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
