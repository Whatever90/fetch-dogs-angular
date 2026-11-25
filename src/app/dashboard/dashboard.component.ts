import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DogService } from '../dog.service';
import { Dog } from '../dog.model';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterComponent } from '../shared/filter/filter.component';
import { FavoritesComponent } from '../shared/favorites/favorites.component';
import { DogPreviewComponent } from '../shared/dog-preview/dog-preview.component';
import { DogsListComponent } from '../shared/dogs-list/dogs-list.component';
import { LocationService } from '../location.service';
import { Location } from './../location.model';
import { lastValueFrom } from 'rxjs';
import { LocationMapSearchComponent } from './location-map-search/location-map-search.component';
import { AuthService } from '../auth.service';
import { FavoritesService } from '../favorites.service';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FavoritesComponent, DogsListComponent, DogPreviewComponent, LocationMapSearchComponent, FilterComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  breeds: string[] = [];
  selectedBreeds: string[] = [];
  dogs: Dog[] = [];
  favorites: string[] = [];
  error: string = '';
  loadingStatus: boolean = false;
  dogsTotalCount: number = 0;
  dogsByIds: { [key: string]: Dog } = {};
  selectedDog: Dog | null = null;
  hoveredDog: Dog | null = null;
  wasFavoritesOpen = false;
  zipCodes: string[] = [];
  private noLocationsInBounds = false;
  private locationSearchRequestId = 0;
  private dogSearchRequestId = 0;
  private locationSearchPending = false;
  private requestedGeoBoundingBox?: { top: number, left: number, bottom: number, right: number };
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
  constructor(private dogService: DogService, private router: Router, private route: ActivatedRoute, private locationService: LocationService, private authService: AuthService, private favoritesService: FavoritesService) { }

  async ngOnInit() {
    this.favorites = this.favoritesService.getFavorites();
    this.filterListeners();
  }
  async ngAfterViewInit() {
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
      const ageMin = params['ageMin'] === undefined || params['ageMin'] === ''
        ? null
        : Number(params['ageMin']);
      const ageMax = params['ageMax'] === undefined || params['ageMax'] === ''
        ? null
        : Number(params['ageMax']);
      let sortField = params['sortField'] || 'name';
      const hasBoundingBox = ['top', 'left', 'bottom', 'right'].every(
        key => params[key] !== undefined && params[key] !== ''
      );
      if (!hasBoundingBox) {
        return;
      }
      const newGeoBoundingBox = {
        top: Number(params['top']),
        left: Number(params['left']),
        bottom: Number(params['bottom']),
        right: Number(params['right'])
      };
      if (!Object.values(newGeoBoundingBox).every(Number.isFinite)) {
        this.locationSearchRequestId++;
        this.locationSearchPending = false;
        this.error = 'The map area is invalid. Please adjust the map and try again.';
        this.loadingStatus = false;
        return;
      }
      const mapAreaChanged = this.requestedGeoBoundingBox !== undefined &&
        JSON.stringify(this.requestedGeoBoundingBox) !== JSON.stringify(newGeoBoundingBox);
      if (mapAreaChanged) {
        this.dogSearchRequestId++;
        this.dogs = [];
        this.dogsTotalCount = 0;
        this.loadingStatus = true;
        this.error = '';
      }
      if (this.locationSearchPending ||
        JSON.stringify(this.requestedGeoBoundingBox) !== JSON.stringify(newGeoBoundingBox)) {
        const requestId = ++this.locationSearchRequestId;
        this.requestedGeoBoundingBox = newGeoBoundingBox;
        this.locationSearchPending = true;
        const locationCriteria = {
          ...this.criteria,
          size: 100,
          from: 0,
          geoBoundingBox: newGeoBoundingBox
        };
        try {
          const zipCodes = await this.findZipCodes(locationCriteria);
          if (requestId !== this.locationSearchRequestId) return;
          this.locationSearchPending = false;
          this.criteria = locationCriteria;
          this.zipCodes = zipCodes;
          this.noLocationsInBounds = !this.zipCodes.length;
        } catch (error: any) {
          if (requestId !== this.locationSearchRequestId) return;
          this.locationSearchPending = false;
          this.requestedGeoBoundingBox = undefined;
          console.error(error);
          if (error.status == 401) {
            this.router.navigate(['/login'])
          }
          this.error = 'Failed to search locations.';
          this.loadingStatus = false;
          return;
        }
      }
      if (this.noLocationsInBounds) {
        this.dogs = [];
        this.dogsTotalCount = 0;
        this.loadingStatus = false;
        return;
      }
      this.fetchDogs(selectedBreeds, sortField, sortOrder, this.zipCodes, ageMin, ageMax);
    });
  }
  private async findZipCodes(criteria: {
    city?: string;
    states?: string[];
    geoBoundingBox?: { top: number, left: number, bottom: number, right: number };
    size?: number;
    from?: number;
  }): Promise<string[]> {
    const zipCodes: string[] = [];
    let from = 0;
    let total = Number.POSITIVE_INFINITY;
    while (from < total) {
      const response = await lastValueFrom(this.locationService.searchLocations({ ...criteria, from }));
      total = response.total;
      zipCodes.push(...response.results.map(location => location.zip_code));
      if (!response.results.length) break;
      from += response.results.length;
    }
    return [...new Set(zipCodes)];
  }
  fetchDogs(selectedBreeds: string[], sortField: string, sortOrder: string, zipCodes: string[], ageMin: number | null, ageMax: number | null): void {
    const requestId = ++this.dogSearchRequestId;
    this.loadingStatus = true;
    this.error = '';
    this.dogs = [];
    this.dogService.searchDogs(selectedBreeds, sortField, sortOrder, zipCodes, ageMin, ageMax).subscribe({
      next: async data => {
        if (requestId !== this.dogSearchRequestId) return;
        this.dogsTotalCount = data.total;
        await this.getDogs(data.resultIds, requestId);
      },
      error: err => {
        if (requestId !== this.dogSearchRequestId) return;
        console.error(err);
        if (err.status == 401) {
          this.router.navigate(['/login'])
        }
        this.error = 'Failed to fetch dogs.';
        this.loadingStatus = false;
      }
    });
  }
  async getDogs(dogIds: string[], requestId: number) {
    try {
      this.dogs = [];
      let dogsToPull: string[] = [];
      let dogsToPullLocationIdx: { [key: string]: number } = {};
      let newDogsList: Dog[] = [];
      dogIds.forEach(id => {
        if (this.dogsByIds[id]) {
          newDogsList.push(this.dogsByIds[id]);
        } else {
          dogsToPullLocationIdx[id] = newDogsList.length;
          newDogsList.push({ id });
          dogsToPull.push(id);
        }
      });
      // also need to pull dogs info for the favorites list on the first load
      if (this.favorites.length) {
        this.favorites.forEach(dogId => {
          if (!this.dogsByIds[dogId] && !dogsToPull.includes(dogId)) {
            dogsToPull.push(dogId)
          }
        })
      }
      if (!dogsToPull.length) {
        if (requestId !== this.dogSearchRequestId) return;
        this.dogs = newDogsList;
        this.loadingStatus = false;
        return;
      }
      let dogs: Dog[] = await lastValueFrom(this.dogService.getDogs(dogsToPull));
      if (dogs) {
        if (requestId !== this.dogSearchRequestId) return;
        let zipCodes: string[] = dogs.map(dog => dog.zip_code)
          .filter((zip): zip is string => zip !== undefined);
        let dogsLocations = await this.locationService.postLocations(zipCodes);
        if (requestId !== this.dogSearchRequestId) return;
        this.dogsLocations = dogsLocations;
        dogs.forEach(dog => {
          if (dog.zip_code) {
            dog.location = dogsLocations[dog.zip_code];
          }
          if (dogsToPullLocationIdx[dog.id] != undefined) {
            newDogsList[dogsToPullLocationIdx[dog.id]] = dog;
          }
        });
        this.loadingStatus = false;
        this.dogs = newDogsList;
        this.storeDogs(dogs);
      }
    } catch (err: any) {
      if (requestId !== this.dogSearchRequestId) return;

      console.error(err);
      if (err?.status == 401) {
        this.router.navigate(['/login'])
      }
      this.error = 'Failed to pull dogs list.';
      this.loadingStatus = false;
    }
  }
  storeDogs(dogs: Dog[]): void {
    dogs.forEach(dog => this.dogsByIds[dog.id] = dog);
  }
  toggleFavorite(dogId: string | Event): void {
    if (typeof dogId != 'string') dogId = dogId.toString();
    this.favoritesService.toggleFavorite(dogId);
    this.favorites = this.favoritesService.getFavorites();
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

  onDogHover(dog: Dog): void {
    this.hoveredDog = { ...dog };
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
      next: res => {
        this.router.navigate(['/login'])
      },
      error: err => {
        console.error(err);
        if (err.code == 201) {
          this.router.navigate(['/login'])
        }
        alert('Failed to logout.');
      }
    });
  }
}