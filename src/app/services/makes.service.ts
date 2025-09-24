import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Make } from '../models/make.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class MakesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Makes`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Make[]> {
    return this.http.get<Make[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(MakeId: number): Observable<Make> {
    const params = new HttpParams().set('MakeId', MakeId);
    return this.http.get<Make>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Make: Make): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Make, { headers: this.authHeaders() });
  }

  update(Make: Make): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Make, { headers: this.authHeaders() });
  }

activate(payload: { MakeId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
