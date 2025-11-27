import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Inspector,InspectorStats } from '../models/inspector.model';
import { AuthService } from '../services/auth'; 



const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InspectorsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Inspectors`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );
  }

  getList(): Observable<Inspector[]> {
    return this.http.get<Inspector[]>(`${this.base}/getlist`, {
      headers: this.authHeaders(),
    });
  }
  getById(userId: number): Observable<Inspector> {
    const params = new HttpParams().set('UserId', userId);
    return this.http.get<Inspector>(`${this.base}/get`, {
      headers: this.authHeaders(),
      params,
    });
  }
  addUser(model: Inspector): Observable<number> {
    
    return this.http.post<number>(`${this.base}/add`, model, { headers: this.authHeaders() });
  }

  updateUser(model: Inspector): Observable<boolean> {
    
    return this.http.put<boolean>(`${this.base}/update`, model, { headers: this.authHeaders() });
  }
  

activateUser(model: Pick<Inspector, 'userId' | 'active' | 'modifiedById'>): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, model, {
    headers: this.authHeaders(),
  });
}
  getStats(): Observable<InspectorStats> {
    return this.http.get<InspectorStats>(`${this.base}/getstats`, {
      headers: this.authHeaders(),
    });
  }
}
