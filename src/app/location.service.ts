import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, Observable, of, tap } from 'rxjs';
import { Location, Coordinates } from './location.model';

interface LocationSearchResponse {
    results: Location[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private apiUrl = 'https://frontend-take-home-service.fetch.com';
    private readonly searchCache = new Map<string, { response: LocationSearchResponse; expiresAt: number }>();
    private readonly searchCacheTtlMs = 5 * 60 * 1000;
    private readonly searchCacheLimit = 100;
    private readonly apiBatchSize = 100;
    cityByZipcode: { [key: string | number]: Location } = {};
    constructor(private http: HttpClient) { }

    // POST /locations: Send an array of ZIP codes and return Location objects.
    async postLocations(zipCodes: string[]): Promise<{ [key: string | number]: Location }> {
        // check any stored zipcodes first
        let result: { [key: string | number]: Location } = {};
        let filteredZipcodesList = [];
        // Loop over each zip code.
        for (const zip of zipCodes) {
            if (this.cityByZipcode[zip]) {
                // If we already have data for this zip code, add it to result.
                result[zip] = this.cityByZipcode[zip];
            } else {
                // Otherwise, add the zip code to the list for which we need to fetch data.
                filteredZipcodesList.push(zip);
            }
        }
        // If there are any zip codes to fetch from the API...
        if (filteredZipcodesList.length > 0) {
            const missingZipCodes = [...new Set(filteredZipcodesList)];
            for (let index = 0; index < missingZipCodes.length; index += this.apiBatchSize) {
                const batch = missingZipCodes.slice(index, index + this.apiBatchSize);
                const locations: Location[] = await lastValueFrom(
                    this.http.post<Location[]>(`${this.apiUrl}/locations`, batch, { withCredentials: true })
                );

                for (const loc of locations) {
                    if (!loc) continue;
                    const zipCode = loc.zip_code;
                    this.cityByZipcode[zipCode] = loc;
                    result[zipCode] = loc;
                }
            }
        }
        return result;
    }

    // POST /locations/search: Search for locations using filtering criteria.
    searchLocations(criteria: {
        city?: string;
        states?: string[];
        geoBoundingBox?: {
            top?: number;
            left?: number;
            bottom?: number;
            right?: number;
            bottom_left?: Coordinates;
            top_left?: Coordinates;
        };
        size?: number;
        from?: number;
    }): Observable<LocationSearchResponse> {
        const cacheKey = JSON.stringify({
            ...criteria,
            states: criteria.states ? [...criteria.states].sort() : undefined
        });
        const cachedEntry = this.searchCache.get(cacheKey);
        if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
            this.searchCache.delete(cacheKey);
            this.searchCache.set(cacheKey, cachedEntry);
            return of({ ...cachedEntry.response, results: [...cachedEntry.response.results] });
        }
        if (cachedEntry) this.searchCache.delete(cacheKey);

        return this.http.post<{ results: Location[], total: number }>(
            `${this.apiUrl}/locations/search`,
            criteria,
            { withCredentials: true }
        ).pipe(
            tap(response => {
                this.searchCache.delete(cacheKey);
                this.searchCache.set(cacheKey, {
                    response: { ...response, results: [...response.results] },
                    expiresAt: Date.now() + this.searchCacheTtlMs
                });
                while (this.searchCache.size > this.searchCacheLimit) {
                    const oldest = this.searchCache.keys().next();
                    if (oldest.done) break;
                    this.searchCache.delete(oldest.value);
                }
            })
        );
    }
}