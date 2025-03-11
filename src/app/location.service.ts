import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, Observable } from 'rxjs';
import { Location, Coordinates } from './location.model';

@Injectable({
    providedIn: 'root'
})
export class LocationService {
    private apiUrl = 'https://frontend-take-home-service.fetch.com';
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
            // Use lastValueFrom to convert the observable to a promise.
            const locations: Location[] = await lastValueFrom(
                this.http.post<Location[]>(`${this.apiUrl}/locations`, filteredZipcodesList, { withCredentials: true })
            );

            // Process the fetched locations.
            for (const loc of locations) {
                if(!loc) continue;
                const zipCode = loc.zip_code;
                // Cache the location in cityByZipcode for future use.
                this.cityByZipcode[zipCode] = loc;

                // Also add it to the result.
                result[zipCode] = loc;
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
    }): Observable<{ results: Location[], total: number }> {
        return this.http.post<{ results: Location[], total: number }>(
            `${this.apiUrl}/locations/search`,
            criteria,
            { withCredentials: true }
        );
    }
}