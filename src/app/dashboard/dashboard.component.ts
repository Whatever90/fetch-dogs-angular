import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogService } from '../dog.service';
import { Dog } from '../dog.model';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterComponent } from '../shared/filter/filter.component';
import { PaginationComponent } from './pagination/pagination.component';
import { FavoritesComponent } from '../shared/favorites/favorites.component';
import { DogPreviewComponent } from '../shared/dog-preview/dog-preview.component';
import { DogsListComponent } from '../shared/dogs-list/dogs-list.component';
import { LocationService } from '../location.service';
import { Location } from './../location.model';
import { lastValueFrom } from 'rxjs';
import { LocationMapSearchComponent } from './location-map-search/location-map-search.component';
import { AuthService } from '../auth.service';
@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, FavoritesComponent, DogsListComponent, DogPreviewComponent, LocationMapSearchComponent, FilterComponent],
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
  hoveredDog: Dog | null = null;
  wasFavoritesOpen = false;
  zipCodes: string[] = [];
  criteria: {
    city?: string;
    states?: string[];
    geoBoundingBox?: { top: number, left: number, bottom: number, right: number };
    size?: number;
    from?: number;
  } = {};

  locations: Location[] | null = null;
  total: number = 0;
  dogsLocations = {};
  @ViewChild('favoritesModal') favoritesModalComponent!: FavoritesComponent;
  @ViewChild('filterModal') filterModalComponent!: FilterComponent;
  @ViewChild('dogPreviewModal') dogPreviewModalComponent!: DogPreviewComponent;
  constructor(private dogService: DogService, private router: Router, private route: ActivatedRoute, private locationService: LocationService, private authService: AuthService) { }

  ngOnInit(): void {
  }
  ngAfterViewInit(): void {
    this.filterListeners();
  }
  async filterListeners() {
    // Subscribe to query param changes
    this.route.queryParams.subscribe(async params => {
      let selectedBreeds = []
      if (typeof params['breeds'] == 'string') {
        selectedBreeds = [params['breeds']]
      } else {
        selectedBreeds = params['breeds'] || [];
      }
      let sortOrder = params['sortOrder'] || 'asc';
      let page = Number(params['page']) || 0;
      let ageMin = Number(params['ageMin']) || null;
      let ageMax = Number(params['ageMax']) || null;
      let pageSize = Number(params['pageSize']) || 25;
      let zipCodes: string[] = [];
      let newGeoBoundingBox = { top: params['top'], left: params['left'], bottom: params['bottom'], right: params['right'] };
      if (newGeoBoundingBox.top === undefined) {
        return;
      }
      if (newGeoBoundingBox.top && newGeoBoundingBox.left && newGeoBoundingBox.bottom && newGeoBoundingBox.right && JSON.stringify(this.criteria.geoBoundingBox) != JSON.stringify(newGeoBoundingBox)) {
        this.criteria.geoBoundingBox = newGeoBoundingBox;
        // Optionally, set a default size if not provided.
        this.criteria.size = this.criteria.size || 25;
        this.criteria.geoBoundingBox = {
          top: Number(this.criteria.geoBoundingBox.top),
          left: Number(this.criteria.geoBoundingBox.left),
          bottom: Number(this.criteria.geoBoundingBox.bottom),
          right: Number(this.criteria.geoBoundingBox.right)
        };
        try {
          const foundLocations = await lastValueFrom(this.locationService.searchLocations(this.criteria));
          if (foundLocations?.results) {
            if (!foundLocations?.results.length) {
              this.dogs = [];
              return;
            }
            zipCodes = foundLocations.results.map(loc => loc.zip_code);
          }
        } catch (error: any) {
          console.error('error!', error);
          if (error.status == 401) {
            this.router.navigate(['/'])
          }
        }
      }
      this.fetchDogs(selectedBreeds, page, sortOrder, pageSize, zipCodes, ageMin, ageMax);
    });
  }
  fetchDogs(selectedBreeds: string[], page: number, sortOrder: string, pageSize: number, zipCodes: string[], ageMin: number | null, ageMax: number | null): void {
    this.loadingStatus = true;
    this.dogs = [];
    this.dogService.searchDogs(selectedBreeds, page, sortOrder, pageSize, zipCodes, ageMin, ageMax).subscribe({
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
  async getDogs(ids: string[]) {
    try {
      this.dogs = [];
      let dogsToPull: string[] = [];
      let dogsToPullLocationIdx: { [key: string]: number } = {};
      let newDogsList: Dog[] = [];
      ids.forEach(id => {
        if (this.dogsByIds[id]) {
          newDogsList.push(this.dogsByIds[id]);
        } else {
          this.dogs.push({ id });
          dogsToPull.push(id);
          dogsToPullLocationIdx[id] = dogsToPull.length - 1;
        }
      });
      if (!dogsToPull.length) {
        this.dogs = newDogsList;
        this.loadingStatus = false;
        return;
      }
      let dogs: Dog[] | undefined = await this.dogService.getDogs(dogsToPull).toPromise();
      if (dogs) {
        let zipCodes: string[] = dogs.map(dog => dog.zip_code)
          .filter((zip): zip is string => zip !== undefined);
        let dogsLocations = await this.locationService.postLocations(zipCodes);
        this.dogsLocations = dogsLocations;
        dogs.forEach(dog => {
          if (dog.zip_code) {
            dog.location = dogsLocations[dog.zip_code];
          }
          newDogsList[dogsToPullLocationIdx[dog.id]] = dog;
        })
        this.loadingStatus = false;
        this.dogs = newDogsList;
        this.storeDogs(dogs);
      }
    } catch (err: any) {

      console.error(err);
      if (err?.status == 401) {
        this.router.navigate(['/'])
      }
      this.error = 'Failed to pull dogs list.';
    }
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

  openFavoritesModal(): void {
    this.favoritesModalComponent.openModal();
  }
  openFilterModal(): void {
    this.filterModalComponent.openModal();
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

  onDogHover(dog: Event | Dog): void {
    this.hoveredDog = dog as Dog;
  }


  // Removes extra offcanvas-backdrop. Couldn't figure out why it renders two of them
  // TODO: figure out wha'ts going on
  removeExtraOffCanvas(): void {
    let offCanvasList = document.getElementsByClassName('offcanvas-backdrop');
    if (offCanvasList.length > 1) {
      offCanvasList[0].remove();
    }
  }
  logout(): void {
    this.authService.logout().subscribe({
      next: res => this.router.navigate(['/']),
      error: err => {
        console.error(err);
        if (err.code == 201) {
          this.router.navigate(['/'])
        }
        alert('Failed to logout.');
      }
    });
  }
  async test() {
    this.locationService.searchLocations({ city: 'Ocala' }).subscribe({
      next: data => {

      },
      error: err => {
      }
    })
  }
}