import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InspectionType } from '../models/inspectiontype.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InspectionTypesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/InspectionTypes`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<InspectionType[]> {
    return this.http.get<InspectionType[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(InspectionTypeId: number): Observable<InspectionType> {
    const params = new HttpParams().set('InspectionTypeId', InspectionTypeId);
    return this.http.get<InspectionType>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(InspectionType: InspectionType): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, InspectionType, { headers: this.authHeaders() });
  }

  update(InspectionType: InspectionType): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, InspectionType, { headers: this.authHeaders() });
  }

activate(payload: { InspectionTypeId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, payload, { headers: this.authHeaders() });
}

}
