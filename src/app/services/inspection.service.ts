import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Inspection } from '../models/inspection.model';
import { AuthService } from '../services/auth';

const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class InspectionsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private base = `${API_BASE}/Inspections`;

  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    // IMPORTANT: do NOT set Content-Type here so FormData works correctly
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Inspection[]> {
    return this.http.get<Inspection[]>(`${this.base}/getlist`, {
      headers: this.authHeaders()
    });
  }

  getById(InspectionId: number): Observable<Inspection> {
    const params = new HttpParams().set('InspectionId', InspectionId);
    return this.http.get<Inspection>(`${this.base}/get`, {
      headers: this.authHeaders(),
      params
    });
  }

  getByInventory(inventoryId: number): Observable<Inspection[]> {
    const params = new HttpParams().set('InventoryId', inventoryId);
    return this.http.get<Inspection[]>(`${this.base}/getbyinventory`, {
      headers: this.authHeaders(),
      params
    });
  }

  add(Inspection: Inspection): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Inspection, {
      headers: this.authHeaders()
    });
  }

  update(Inspection: Inspection): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Inspection, {
      headers: this.authHeaders()
    });
  }

  activate(payload: {
    InspectionId: number;
    Active: boolean;
    ModifiedById?: number | null;
  }): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/activate`, payload, {
      headers: this.authHeaders()
    });
  }

  /**
   * Add inspection row WITH image (InputType = Image).
   * This calls /Inspections/add-with-image (multipart/form-data).
   */
  addWithImage(
    file: File,
    payload: {
      inspectionTypeId: number;
      inspectionCheckpointId: number;
      inventoryId: number;
      documentTypeId: number;
      createdById?: number | null;
      documentName?: string | null;
    }
  ): Observable<number> {
    const form = new FormData();
    form.append('file', file);
    form.append('inspectionTypeId', payload.inspectionTypeId.toString());
    form.append('inspectionCheckpointId', payload.inspectionCheckpointId.toString());
    form.append('inventoryId', payload.inventoryId.toString());
    form.append('documentTypeId', payload.documentTypeId.toString());

    if (payload.createdById != null) {
      form.append('createdById', payload.createdById.toString());
    }
    if (payload.documentName) {
      form.append('documentName', payload.documentName);
    }

    return this.http.post<number>(`${this.base}/add-with-image`, form, {
      headers: this.authHeaders()
    });
  }
}
