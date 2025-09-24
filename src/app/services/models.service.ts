import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Model } from '../models/model.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Models`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Model[]> {
    return this.http.get<Model[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(ModelId: number): Observable<Model> {
    const params = new HttpParams().set('ModelId', ModelId);
    return this.http.get<Model>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Model: Model): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Model, { headers: this.authHeaders() });
  }

  update(Model: Model): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Model, { headers: this.authHeaders() });
  }

activate(payload: { ModelId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
