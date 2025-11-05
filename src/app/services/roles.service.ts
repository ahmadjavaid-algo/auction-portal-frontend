import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Role } from '../models/role.model';
import { AuthService } from '../services/auth';
import { RoleClaim } from '../models/role-claim.model';
import { RoleStats } from '../models/role.model';

const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Roles`;
  private rcBase = `${API_BASE}/RoleClaims`;
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
  add(role: Role): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, role, { headers: this.authHeaders() });
  }

  update(role: Role): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, role, { headers: this.authHeaders() });
  }

  activate(roleId: number, active: boolean): Observable<boolean> {
    const payload = { roleId, active };
    return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
  }
  getRoleClaimsList(): Observable<RoleClaim[]> {
    return this.http.get<RoleClaim[]>(
      `${this.rcBase}/list`,
      { headers: this.authHeaders() }
    );
  }

  
  getRoleClaimsByRole(roleId: number): Observable<RoleClaim[]> {
    const params = new HttpParams().set('RoleId', roleId);
    return this.http.get<RoleClaim[]>(
      `${this.rcBase}/byrole`,
      { headers: this.authHeaders(), params }
    );
  }

  
  setRoleClaims(roleId: number, claimIds: number[]): Observable<boolean> {
    const payload = { roleId, claimIds };
    return this.http.post<boolean>(`${this.rcBase}/set`, payload, { headers: this.authHeaders() });
  }
  getStats(): Observable<RoleStats> {
    return this.http.get<RoleStats>(`${this.base}/getstats`, { headers: this.authHeaders() });
  }
}
