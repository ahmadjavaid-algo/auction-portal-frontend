import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role } from '../models/role.model';
import { AuthService } from '../services/auth';

// Use '/api' if you run the Angular proxy; otherwise swap to 'http://localhost:5070/api'
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Roles`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(roleId: number): Observable<Role> {
    const params = new HttpParams().set('RoleId', roleId);
    return this.http.get<Role>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
}
