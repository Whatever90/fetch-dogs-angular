import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, concatMap, expand, from, map, of, reduce, tap } from 'rxjs';
import { Dog } from './dog.model';

interface DogSearchResponse {
  resultIds: string[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class DogService {
  private apiUrl = 'https://frontend-take-home-service.fetch.com';
  private readonly searchCache = new Map<string, { response: DogSearchResponse; expiresAt: number }>();
  private readonly searchCacheTtlMs = 5 * 60 * 1000;
  private readonly searchCacheLimit = 50;
  private readonly apiBatchSize = 100;

  constructor(private http: HttpClient) { }

  getBreeds(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/dogs/breeds`, { withCredentials: true });
  }

  searchDogs(breeds: string[], sortField: string, sortOrder: string, zipCodes: string[], ageMin: number | null, ageMax: number | null): Observable<DogSearchResponse> {
    const cacheKey = JSON.stringify({
      breeds: [...breeds].sort(),
      sortField,
      sortOrder,
      zipCodes: [...zipCodes].sort(),
      ageMin,
      ageMax
    });
    const cachedResponse = this.getCachedSearch(cacheKey);
    if (cachedResponse) return of(cachedResponse);

    const fetchPage = (fromIndex: number) => {
      let params = new HttpParams()
        .set('size', this.apiBatchSize.toString())
        .set('sort', `${sortField}:${sortOrder}`)
        .set('from', fromIndex.toString());
      breeds.forEach(breed => {
        params = params.append('breeds', breed);
      });
      zipCodes.forEach(zipCode => {
        params = params.append('zipCodes', zipCode);
      });
      if (ageMin !== null) {
        params = params.append('ageMin', ageMin.toString());
      }
      if (ageMax !== null) {
        params = params.append('ageMax', ageMax.toString());
      }
      return this.http.get<DogSearchResponse>(`${this.apiUrl}/dogs/search`, { params, withCredentials: true })
        .pipe(map(response => ({ fromIndex, response })));
    };

    return fetchPage(0).pipe(
      expand(({ fromIndex, response }) => {
        const nextFrom = fromIndex + response.resultIds.length;
        return response.resultIds.length && nextFrom < response.total ? fetchPage(nextFrom) : EMPTY;
      }),
      reduce((allResults, page) => {
        allResults.resultIds.push(...page.response.resultIds);
        allResults.total = page.response.total;
        return allResults;
      }, { resultIds: [], total: 0 } as DogSearchResponse),
      tap(response => this.cacheSearch(cacheKey, response))
    );
  }

  private getCachedSearch(cacheKey: string): DogSearchResponse | undefined {
    const entry = this.searchCache.get(cacheKey);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.searchCache.delete(cacheKey);
      return undefined;
    }

    this.searchCache.delete(cacheKey);
    this.searchCache.set(cacheKey, entry);
    return { ...entry.response, resultIds: [...entry.response.resultIds] };
  }

  private cacheSearch(cacheKey: string, response: DogSearchResponse): void {
    this.searchCache.delete(cacheKey);
    this.searchCache.set(cacheKey, {
      response: { ...response, resultIds: [...response.resultIds] },
      expiresAt: Date.now() + this.searchCacheTtlMs
    });
    while (this.searchCache.size > this.searchCacheLimit) {
      const oldest = this.searchCache.keys().next();
      if (oldest.done) break;
      this.searchCache.delete(oldest.value);
    }
  }

  getDogs(ids: string[]): Observable<Dog[]> {
    const batches: string[][] = [];
    for (let index = 0; index < ids.length; index += this.apiBatchSize) {
      batches.push(ids.slice(index, index + this.apiBatchSize));
    }
    if (!batches.length) return of([]);
    return from(batches).pipe(
      concatMap(batch => this.http.post<Dog[]>(`${this.apiUrl}/dogs`, batch, { withCredentials: true })),
      reduce((dogs, batch) => [...dogs, ...batch], [] as Dog[])
    );
  }
  matchDogs(favoriteIds: string[]): Observable<{ match: string }> {
    return this.http.post<{ match: string }>(`${this.apiUrl}/dogs/match`, favoriteIds, { withCredentials: true });
  }

}