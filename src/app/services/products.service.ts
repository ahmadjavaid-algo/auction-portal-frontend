import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Products`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(ProductId: number): Observable<Product> {
    const params = new HttpParams().set('ProductId', ProductId);
    return this.http.get<Product>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Product: Product): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Product, { headers: this.authHeaders() });
  }

  update(Product: Product): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Product, { headers: this.authHeaders() });
  }

activate(payload: { ProductId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
