import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User,UserStats } from '../models/user.model';
import { AuthService } from '../services/auth'; 



const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Users`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );
  }

  getList(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/getlist`, {
      headers: this.authHeaders(),
    });
  }
  getById(userId: number): Observable<User> {
    const params = new HttpParams().set('UserId', userId);
    return this.http.get<User>(`${this.base}/get`, {
      headers: this.authHeaders(),
      params,
    });
  }
  addUser(model: User): Observable<number> {
    
    return this.http.post<number>(`${this.base}/add`, model, { headers: this.authHeaders() });
  }

  updateUser(model: User): Observable<boolean> {
    
    return this.http.put<boolean>(`${this.base}/update`, model, { headers: this.authHeaders() });
  }
  

activateUser(model: Pick<User, 'userId' | 'active' | 'modifiedById'>): Observable<boolean> {
  return this.http.put<boolean>(`${this.base}/activate`, model, {
    headers: this.authHeaders(),
  });
}
  getStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.base}/getstats`, {
      headers: this.authHeaders(),
    });
  }
}
