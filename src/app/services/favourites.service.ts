import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Favourite } from '../models/favourite.model';
import { AuthService } from '../services/auth';
const API_BASE = 'http://localhost:5070/api';

@Injectable({ providedIn: 'root' })
export class FavouriteService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${API_BASE}/Favourites`;
  private authHeaders(): HttpHeaders {
    const token = this.auth.token;
    return new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  }

  getList(): Observable<Favourite[]> {
    return this.http.get<Favourite[]>(`${this.base}/getlist`, { headers: this.authHeaders() });
  }

  getById(FavouriteId: number): Observable<Favourite> {
    const params = new HttpParams().set('FavouriteId', FavouriteId);
    return this.http.get<Favourite>(`${this.base}/get`, { headers: this.authHeaders(), params });
  }
  add(Favourite: Favourite): Observable<number> {
    return this.http.post<number>(`${this.base}/add`, Favourite, { headers: this.authHeaders() });
  }

  update(Favourite: Favourite): Observable<boolean> {
    return this.http.put<boolean>(`${this.base}/update`, Favourite, { headers: this.authHeaders() });
  }


activate(payload: { FavouriteId: number; Active: boolean; ModifiedById?: number | null }): Observable<boolean> {
  const body = {
    bidderInventoryAuctionFavoriteId: payload.FavouriteId, 
    active: payload.Active,
    modifiedById: payload.ModifiedById ?? null
  };

  return this.http.put<boolean>(`${this.base}/activate`, body, {
    headers: this.authHeaders()
  });
}


}
