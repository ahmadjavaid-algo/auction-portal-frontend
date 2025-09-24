import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Inventory } from '../models/inventory.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Inventorys`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(InventoryId: number): Observable<Inventory> {
    const params = new HttpParams().set('InventoryId', InventoryId);
    return this.http.get<Inventory>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Inventory: Inventory): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Inventory, { headers: this.authHeaders() });
  }

  update(Inventory: Inventory): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Inventory, { headers: this.authHeaders() });
  }

activate(payload: { InventoryId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
