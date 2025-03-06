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

  searchDogs(breeds: string[], page: number, sortOrder: string, pageSize: number): Observable<Dog[]> {
    let params = new HttpParams()
      .set('size', pageSize.toString())
      .set('sort', `breed:${sortOrder}`)
      .set('from', (page * pageSize).toString());
    breeds.forEach(breed => {
      params = params.append('breeds', breed);
    });

    return this.http.get<any>(`${this.apiUrl}/dogs/search`, { params, withCredentials: true }).pipe(
      switchMap(data => {
        // data.resultIds is an array of dog IDs
        return this.http.post<Dog[]>(`${this.apiUrl}/dogs`, data.resultIds, { withCredentials: true });
      })
    );
  }

  matchDogs(favoriteIds: string[]): Observable<{ match: string }> {
    return this.http.post<{ match: string }>(`${this.apiUrl}/dogs/match`, favoriteIds, { withCredentials: true });
  }
}