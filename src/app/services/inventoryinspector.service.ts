import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryInspector } from '../models/inventoryinspector.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InventoryInspectorService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/InventoryInspectors`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<InventoryInspector[]> {
    return this.http.get<InventoryInspector[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(InventoryInspectorId: number): Observable<InventoryInspector> {
    const params = new HttpParams().set('InventoryInspectorId', InventoryInspectorId);
    return this.http.get<InventoryInspector>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(InventoryInspector: InventoryInspector): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, InventoryInspector, { headers: this.authHeaders() });
  }

  update(InventoryInspector: InventoryInspector): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, InventoryInspector, { headers: this.authHeaders() });
  }

activate(payload: { InventoryInspectorId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
