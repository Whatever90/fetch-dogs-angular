import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { Dog } from '../../dog.model';
import { CommonModule } from '@angular/common';
import { DogService } from '../../dog.service';
import { Modal } from 'bootstrap';
import { DogsListComponent } from '../dogs-list/dogs-list.component';
import { DogImageFallbackDirective } from '../dog-image-fallback.directive';

@Component({
  selector: 'favorites',
  imports: [CommonModule, DogsListComponent, DogImageFallbackDirective],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent implements AfterViewInit {
  @Input() dogsByIds: { [key: string]: Dog } = {};
  @Input() favorites: string[] = [];
  @Input() loadingStatus = false;
  @Output() updateFavorites = new EventEmitter<string>();
  @Output() updateSelectedDog = new EventEmitter<Event | Dog>();

  matchedDog: Dog | null = null;
  isMatching = false;
  private modalInstance!: Modal;
  constructor(private dogService: DogService) {

  }
  ngAfterViewInit(): void {
    const modalEl = document.getElementById('favoritesModal');
    if (modalEl) {
      this.modalInstance = new Modal(modalEl);
    }
  }
  openModal(): void {
    if (this.modalInstance) {
      this.modalInstance.show();
    }
  }

  closeModal(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }
  generateMatch(): void {
    const availableIds = this.convertFavoritesToDogsList().map(dog => dog.id);
    if (!availableIds.length || this.isMatching || this.isLoadingMissingDogs) {
      return;
    }
    this.isMatching = true;
    this.dogService.matchDogs(availableIds).subscribe({
      next: res => {
        this.matchedDog = this.dogsByIds[res.match] ?? null;
        this.isMatching = false;
      },
      error: err => {
        this.isMatching = false;
        console.error(err);
        alert('Failed to generate a match.');
      }
    });
  }
  convertFavoritesToDogsList(): Dog[] {
    return this.favorites
      .map(id => this.dogsByIds[id])
      .filter((dog): dog is Dog => dog !== undefined);
  }
  get missingFavoriteIds(): string[] {
    return this.favorites.filter(id => !this.dogsByIds[id]);
  }
  get isLoadingMissingDogs(): boolean {
    return this.loadingStatus && this.missingFavoriteIds.length > 0;
  }
  removeUnavailableFavorites(): void {
    this.missingFavoriteIds.forEach(id => this.updateFavorites.emit(id));
  }
  toggleFavorite(id: string | Event): void {
    if (typeof id != 'string') id = id.toString();
    this.updateFavorites.emit(id);
  }
  selectedDogUpdated(dog: Event | Dog): void {
    this.updateSelectedDog.emit(dog);
  }
}
