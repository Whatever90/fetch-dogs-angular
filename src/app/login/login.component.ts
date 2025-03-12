import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { FavoritesService } from '../favorites.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  name: string = '';
  email: string = '';
  error: string = '';
  loadingStatus: boolean = false;
  constructor(private authService: AuthService, private router: Router, private favoritesService: FavoritesService) { }

  onSubmit(): void {
    this.loadingStatus = true;
    this.error = '';
    this.authService.login(this.name, this.email).subscribe({
      next: () => {
        this.favoritesService.setCurrentUser(this.name);
        this.router.navigate(['/'])
        this.loadingStatus = false;
      },
      error: err => {
        console.error(err);
        this.error = 'Login failed. Please check your credentials.';
        this.loadingStatus = false;
      }
    });
  }
}