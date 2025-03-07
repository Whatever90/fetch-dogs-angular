import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DogService } from '../dog.service';
import { Dog } from '../dog.model';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterComponent } from './filter/filter.component';
import { PaginationComponent } from './pagination/pagination.component';
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterComponent, PaginationComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements AfterViewInit  {
  breeds: string[] = [];
  selectedBreeds: string[] = [];
  dogs: Dog[] = [];
  favorites: Set<string> = new Set();
  error: string = '';
  page: number = 0;
  sortOrder: string = 'asc';
  pageSize: number = 25;
  loadingStatus: boolean = false;
  dogsTotalCount: number = 0;
  pagesTotalCount: number = 0;
  availableIndexes = [];
  dogsIds: { [key: string]: any } = {};
  selectedDog: Dog | null = null;
  constructor(private dogService: DogService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    // this.fetchDogs();
    // Subscribe to query param changes
    this.route.queryParams.subscribe(params => {
      if (!params['breeds']) {
        this.selectedBreeds = [];
      } else if (typeof params['breeds'] == 'string') {
        this.selectedBreeds = [params['breeds']]
      } else {
        this.selectedBreeds = params['breeds']
      }
      this.sortOrder = params['sortOrder'] || 'asc';
      this.page = Number(params['page']) || 0;
      this.fetchDogs();
    });
  }
  ngAfterViewInit(): void {
    const modalElement = document.getElementById('dogImageExpandModal');
    if (modalElement) {
      modalElement.addEventListener('hidden.bs.modal', () => {
        // If the active element is inside the modal, remove focus from it.
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && modalElement.contains(activeElement)) {
          activeElement.blur();
        }
      });
    }
  }
  fetchDogs(): void {
    this.loadingStatus = true;
    this.dogs = [];
    this.dogService.searchDogs(this.selectedBreeds, this.page, this.sortOrder, this.pageSize).subscribe({
      next: async data => {
        if (data.total != this.dogsTotalCount) {
          this.dogsTotalCount = data.total;
          this.pagesTotalCount = Math.ceil(this.dogsTotalCount / this.pageSize);
        }
        await this.getDogs(data.resultIds);
      },
      error: err => {
        console.error(err);
        if (err.status == 401) {
          this.router.navigate(['/'])
        }
        this.error = 'Failed to fetch dogs.';
      }
    });
  }
  getDogs(ids: string[]): void {
    this.dogs = [];
    let dogsToPull: string[] = [];
    let dogsToPullLocationIdx: { [key: string]: number } = {};
    ids.forEach(id => {
      if (this.dogsIds[id]) {
        this.dogs.push(this.dogsIds[id]);
      } else {
        this.dogs.push({ id });
        dogsToPull.push(id);
        dogsToPullLocationIdx[id] = dogsToPull.length - 1;
      }
    });
    if (!dogsToPull.length) {
      this.loadingStatus = false;
      return;
    }
    this.dogService.getDogs(dogsToPull).subscribe({
      next: data => {
        data.forEach(dog => {
          this.dogs[dogsToPullLocationIdx[dog.id]] = dog;
        })
        this.loadingStatus = false;
        this.storeDogs(data);
      },
      error: err => {
        console.error(err);
        if (err.status == 401) {
          this.router.navigate(['/'])
        }
        this.error = 'Failed to pull dogs list.';
      }
    })
  }
  storeDogs(dogs: Dog[]): void {
    dogs.forEach(dog => this.dogsIds[dog.id] = dog);
  }
  toggleFavorite(id: string): void {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
    } else {
      this.favorites.add(id);
    }
  }

  goToPage(page: number | string) {
    this.page = (page as number);
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