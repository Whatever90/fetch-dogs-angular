import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DogService } from '../dog.service';
import { Dog } from '../dog.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  breeds: string[] = [];
  selectedBreeds: string[] = [];
  dogs: Dog[] = [];
  favorites: Set<string> = new Set();
  error: string = '';
  page: number = 0;
  sortOrder: string = 'asc';
  pageSize: number = 25;

  constructor(private dogService: DogService) { }

  ngOnInit(): void {
    this.loadBreeds();
    this.fetchDogs();
  }

  loadBreeds(): void {
    this.dogService.getBreeds().subscribe({
      next: data => this.breeds = data,
      error: err => {
        console.error(err);
        this.error = 'Failed to load breeds.';
      }
    });
  }

  fetchDogs(): void {
    this.dogService.searchDogs(this.selectedBreeds, this.page, this.sortOrder, this.pageSize).subscribe({
      next: data => this.dogs = data,
      error: err => {
        console.error(err);
        this.error = 'Failed to fetch dogs.';
      }
    });
  }

  toggleFavorite(id: string): void {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
  }

  nextPage(): void {
    this.page++;
    this.fetchDogs();
  }

  previousPage(): void {
    if (this.page > 0) {
      this.page--;
      this.fetchDogs();
    }
  }

  onSortChange(order: string): void {
    this.sortOrder = order;
    this.fetchDogs();
  }

  generateMatch(): void {
    const favArray = Array.from(this.favorites);
    if (favArray.length === 0) {
      alert("Please select at least one favorite dog.");
      return;
    }
    this.dogService.matchDogs(favArray).subscribe({
      next: res => alert(`You have been matched with dog ID: ${res.match}`),
      error: err => {
        console.error(err);
        alert('Failed to generate a match.');
      }
    });
  }
}