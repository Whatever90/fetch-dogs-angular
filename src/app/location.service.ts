import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Location, Coordinates } from './location.model';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private apiUrl = 'https://frontend-take-home-service.fetch.com';

    constructor(private http: HttpClient) { }

    // POST /locations: Send an array of ZIP codes and return Location objects.
    postLocations(zipCodes: string[]): Observable<Location[]> {
        return this.http.post<Location[]>(`${this.apiUrl}/locations`, zipCodes, { withCredentials: true });
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
    }): Observable<{ results: Location[], total: number }> {
        return this.http.post<{ results: Location[], total: number }>(
            `${this.apiUrl}/locations/search`,
            criteria,
            { withCredentials: true }
        );
    }
}