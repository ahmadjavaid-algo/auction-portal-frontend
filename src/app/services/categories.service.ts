import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../models/category.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class CategorysService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Categories`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(CategoryId: number): Observable<Category> {
    const params = new HttpParams().set('CategoryId', CategoryId);
    return this.http.get<Category>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Category: Category): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Category, { headers: this.authHeaders() });
  }

  update(Category: Category): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Category, { headers: this.authHeaders() });
  }

activate(payload: { CategoryId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
