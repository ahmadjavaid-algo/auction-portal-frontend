
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth';

const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class DocumentFileService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/DocumentFiles`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  /**
   * Upload the physical file + metadata to server.
   * Server returns new DocumentFileId (number).
   */
  upload(file: File, options: { documentTypeId: number; documentName?: string | null; createdById?: number | null }): Observable<number> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('documentTypeId', String(options.documentTypeId));
    if (options.documentName) fd.append('documentName', options.documentName);
    if (options.createdById != null) fd.append('createdById', String(options.createdById));

    return this.http.post<number>(`${this.base}/upload`, fd, { headers: this.authHeaders() });
  }
}
