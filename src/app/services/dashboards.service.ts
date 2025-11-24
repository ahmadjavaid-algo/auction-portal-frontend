import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Dashboard } from '../models/dashboard.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class DashboardsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Dashboards`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Dashboard[]> {
    return this.http.get<Dashboard[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(DashboardId: number): Observable<Dashboard> {
    const params = new HttpParams().set('DashboardId', DashboardId);
    return this.http.get<Dashboard>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Dashboard: Dashboard): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Dashboard, { headers: this.authHeaders() });
  }

  update(Dashboard: Dashboard): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Dashboard, { headers: this.authHeaders() });
  }

activate(payload: { DashboardId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
