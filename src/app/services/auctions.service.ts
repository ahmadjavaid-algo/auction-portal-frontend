import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Auction } from '../models/auction.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class AuctionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Auctions`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Auction[]> {
    return this.http.get<Auction[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(AuctionId: number): Observable<Auction> {
    const params = new HttpParams().set('AuctionId', AuctionId);
    return this.http.get<Auction>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Auction: Auction): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Auction, { headers: this.authHeaders() });
  }

  update(Auction: Auction): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Auction, { headers: this.authHeaders() });
  }

activate(payload: { AuctionId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
