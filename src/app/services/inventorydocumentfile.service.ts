import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryDocumentFile } from '../models/inventorydocumentfile.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InventoryDocumentFileService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/InventoryDocumentFiles`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<InventoryDocumentFile[]> {
    return this.http.get<InventoryDocumentFile[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(InventoryDocumentFileId: number): Observable<InventoryDocumentFile> {
    const params = new HttpParams().set('InventoryDocumentFileId', InventoryDocumentFileId);
    return this.http.get<InventoryDocumentFile>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(InventoryDocumentFile: InventoryDocumentFile): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, InventoryDocumentFile, { headers: this.authHeaders() });
  }

  update(InventoryDocumentFile: InventoryDocumentFile): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, InventoryDocumentFile, { headers: this.authHeaders() });
  }

activate(payload: { InventoryDocumentFileId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
