import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InspectionCheckpoint } from '../models/inspectioncheckpoint.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InspectionCheckpointsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/InspectionCheckpoints`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<InspectionCheckpoint[]> {
    return this.http.get<InspectionCheckpoint[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(InspectionCheckpointId: number): Observable<InspectionCheckpoint> {
    const params = new HttpParams().set('InspectionCheckpointId', InspectionCheckpointId);
    return this.http.get<InspectionCheckpoint>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(InspectionCheckpoint: InspectionCheckpoint): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, InspectionCheckpoint, { headers: this.authHeaders() });
  }

  update(InspectionCheckpoint: InspectionCheckpoint): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, InspectionCheckpoint, { headers: this.authHeaders() });
  }

activate(payload: { InspectionCheckpointId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
