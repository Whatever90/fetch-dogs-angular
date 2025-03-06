import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://frontend-take-home-service.fetch.com';

  constructor(private http: HttpClient) { }

  login(name: string, email: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/auth/login`,
      { name, email },
      { withCredentials: true }
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true });
  }
}