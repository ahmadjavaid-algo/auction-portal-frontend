// src/app/services/emails.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Email } from '../models/email.model';
import { AuthService } from '../services/auth';

// If you set up an Angular proxy: const API_BASE = '/api';
// Otherwise, point this to your swagger origin: e.g. 'http://localhost:5070/api'
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class EmailsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Emails`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  /** GET /Emails/getlist */
  getList(): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.base}/getlist`, {
      headers: this.authHeaders(),
    });
  }

  /** GET /Emails/get?EmailId=123 */
  getById(emailId: number): Observable<Email> {
    const params = new HttpParams().set('EmailId', String(emailId));
    return this.http.get<Email>(`${this.base}/get`, {
      headers: this.authHeaders(),
      params,
    });
  }

  /** POST /Emails/add -> returns new EmailId (number) */
  addEmail(model: Email): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, model, {
      headers: this.authHeaders(),
    });
  }

  /** PUT /Emails/update -> returns boolean */
  updateEmail(model: Email): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, model, {
      headers: this.authHeaders(),
    });
  }

  /** PUT /Emails/activate -> returns boolean */
  activateEmail(model: Pick<Email, 'emailId' | 'active' | 'modifiedById'>): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/activate`, model, {
      headers: this.authHeaders(),
    });
  }
  getByCode(emailCode: string): Observable<Email | null> {
    const params = new HttpParams().set('EmailCode', emailCode);
    return this.http.get<Email>(`${this.base}/getbycode`, { headers: this.authHeaders(), params });
  }
}
