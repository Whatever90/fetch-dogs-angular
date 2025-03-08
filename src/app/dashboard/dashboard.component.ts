import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogService } from '../dog.service';
import { Dog } from '../dog.model';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterComponent } from './filter/filter.component';
import { PaginationComponent } from './pagination/pagination.component';
import { FavoritesComponent } from '../shared/favorites/favorites.component';
import { DogPreviewComponent } from '../shared/dog-preview/dog-preview.component';
import { DogsListComponent } from '../shared/dogs-list/dogs-list.component';
@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterComponent, PaginationComponent, FavoritesComponent, DogsListComponent, DogPreviewComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  breeds: string[] = [];
  selectedBreeds: string[] = [];
  dogs: Dog[] = [];
  favorites: string[] = [];
  error: string = '';
  page: number = 0;
  sortOrder: string = 'asc';
  pageSize: number = 25;
  loadingStatus: boolean = false;
  dogsTotalCount: number = 0;
  pagesTotalCount: number = 0;
  availableIndexes = [];
  dogsByIds: { [key: string]: Dog } = {};
  selectedDog: Dog | null = null;
  wasFavoritesOpen = false;

  @ViewChild('favoritesModal') favoritesModalComponent!: FavoritesComponent;
  @ViewChild('dogPreviewModal') dogPreviewModalComponent!: DogPreviewComponent;
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
      if (this.dogsByIds[id]) {
        this.dogs.push(this.dogsByIds[id]);
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
    dogs.forEach(dog => this.dogsByIds[dog.id] = dog);
  }
  toggleFavorite(id: string | Event): void {
    if (typeof id != 'string') id = id.toString();
    if (this.favorites.includes(id)) {
      this.favorites = this.favorites.filter((item) => {
        return item !== id
      });
    } else {
      this.favorites.push(id);
    }
  }

  goToPage(page: number | string) {
    this.page = (page as number);
    this.fetchDogs();
  }

  generateMatch(): void {
    if (!this.favorites.length) {
      return;
    }
    this.dogService.matchDogs(this.favorites).subscribe({
      next: res => this.selectedDog = this.dogsByIds[res.match],
      error: err => {
        console.error(err);
        alert('Failed to generate a match.');
      }
    });
  }
  openFavoritesModal(): void {
    this.favoritesModalComponent.openModal();
  }
  openDogPreviewModal(dog: Dog): void {
    if (this.isFavoritesModalOpen()) {
      this.wasFavoritesOpen = true;
      this.favoritesModalComponent.closeModal();
    }
    this.dogPreviewModalComponent.openModal(dog);
  }
  selectedDogUpdated(dog: Event | Dog): void {
    this.openDogPreviewModal(dog as Dog);
  }
  // Helper to determine if favorites modal is open (e.g., by checking a CSS class)
  isFavoritesModalOpen(): boolean {
    const modalEl = document.getElementById('favoritesModal');
    return modalEl ? modalEl.classList.contains('show') : false;
  }
  // Handle the event when dog preview modal is closed.
  onDogPreviewClosed(): void {
    if (this.wasFavoritesOpen) {
      this.favoritesModalComponent.openModal();
      this.wasFavoritesOpen = false;
    }
  }
  // Removes extra offcanvas-backdrop. Couldn't figure out why it renders two of them
  // TODO: figure out wha'ts going on
  removeExtraOffCanvas(): void {
    let offCanvasList = document.getElementsByClassName('offcanvas-backdrop');
    if(offCanvasList.length > 1) {
      offCanvasList[0].remove();
    }
  }
}