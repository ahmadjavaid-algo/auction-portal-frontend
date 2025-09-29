import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryAuction } from '../models/inventoryauction.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InventoryAuctionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/InventoryAuctions`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<InventoryAuction[]> {
    return this.http.get<InventoryAuction[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(InventoryAuctionId: number): Observable<InventoryAuction> {
    const params = new HttpParams().set('InventoryAuctionId', InventoryAuctionId);
    return this.http.get<InventoryAuction>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(InventoryAuction: InventoryAuction): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, InventoryAuction, { headers: this.authHeaders() });
  }

  update(InventoryAuction: InventoryAuction): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, InventoryAuction, { headers: this.authHeaders() });
  }

activate(payload: { InventoryAuctionId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
