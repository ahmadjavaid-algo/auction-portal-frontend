
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Email } from '../models/email.model';
import { AuthService } from '../services/auth';



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

  
  getList(): Observable<Email[]> {
    return this.http.get<Email[]>(`${this.base}/getlist`, {
      headers: this.authHeaders(),
    });
  }

  
  getById(emailId: number): Observable<Email> {
    const params = new HttpParams().set('EmailId', String(emailId));
    return this.http.get<Email>(`${this.base}/get`, {
      headers: this.authHeaders(),
      params,
    });
  }

  
  addEmail(model: Email): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, model, {
      headers: this.authHeaders(),
    });
  }

  
  updateEmail(model: Email): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, model, {
      headers: this.authHeaders(),
    });
  }

  
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
