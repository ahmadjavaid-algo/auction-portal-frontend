import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Year } from '../models/year.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class YearsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Years`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Year[]> {
    return this.http.get<Year[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(YearId: number): Observable<Year> {
    const params = new HttpParams().set('YearId', YearId);
    return this.http.get<Year>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Year: Year): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Year, { headers: this.authHeaders() });
  }

  update(Year: Year): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Year, { headers: this.authHeaders() });
  }

activate(payload: { YearId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
