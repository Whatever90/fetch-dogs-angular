import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FavoritesService } from './favorites.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://frontend-take-home-service.fetch.com';

  constructor(private http: HttpClient, private favoritesService: FavoritesService) { }
  // !!!!!!!!!!!!!!!!!!!!
  // the 200 response is just a string 'OK', be careful to not expect the JSON format
  // !!!!!!!!!!!!!!!!!!!!
  login(name: string, email: string): Observable<any> { 
    return this.http.post(
      `${this.apiUrl}/auth/login`,
      { name, email },
      { withCredentials: true, responseType: 'text' }
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true, responseType: 'text' });
  }
}