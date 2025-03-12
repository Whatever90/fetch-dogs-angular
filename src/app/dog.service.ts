import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { Dog } from './dog.model';

@Injectable({
  providedIn: 'root'
})
export class DogService {
  private apiUrl = 'https://frontend-take-home-service.fetch.com';

  constructor(private http: HttpClient) { }

  getBreeds(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/dogs/breeds`, { withCredentials: true });
  }

  searchDogs(breeds: string[], page: number, sortField: string, sortOrder: string, pageSize: number, zipCodes: string[], ageMin: number | null, ageMax: number | null): Observable<any> {
    let params = new HttpParams()
      .set('size', pageSize.toString())
      .set('sort', `${sortField}:${sortOrder}`)
      .set('from', (page * pageSize).toString());
    breeds.forEach(breed => {
      params = params.append('breeds', breed);
    });
    zipCodes.forEach(zipCode => {
      params = params.append('zipCodes', zipCode);
    });
    if (ageMin) {
      params = params.append('ageMin', ageMin.toString());
    }
    if (ageMax) {
      params = params.append('ageMax', ageMax.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/dogs/search`, { params, withCredentials: true })
  }
  getDogs(ids: string[]): Observable<Dog[]> {
    return this.http.post<Dog[]>(`${this.apiUrl}/dogs`, ids, { withCredentials: true });
  }
  matchDogs(favoriteIds: string[]): Observable<{ match: string }> {
    return this.http.post<{ match: string }>(`${this.apiUrl}/dogs/match`, favoriteIds, { withCredentials: true });
  }

}