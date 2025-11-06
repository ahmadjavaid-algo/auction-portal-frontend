import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuctionBid } from '../models/auctionbid.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class AuctionBidService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/AuctionBids`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<AuctionBid[]> {
    return this.http.get<AuctionBid[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(AuctionBidId: number): Observable<AuctionBid> {
    const params = new HttpParams().set('AuctionBidId', AuctionBidId);
    return this.http.get<AuctionBid>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(AuctionBid: AuctionBid): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, AuctionBid, { headers: this.authHeaders() });
  }

  update(AuctionBid: AuctionBid): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, AuctionBid, { headers: this.authHeaders() });
  }

activate(payload: { AuctionBidId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
