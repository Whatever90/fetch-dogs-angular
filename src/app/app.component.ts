import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
})
export class AppComponent {}