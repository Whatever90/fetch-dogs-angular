import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { Dog } from '../../dog.model';
import { CommonModule } from '@angular/common';
import { DogService } from '../../dog.service';
import { Modal } from 'bootstrap';
import { DogsListComponent } from '../dogs-list/dogs-list.component';

@Component({
  selector: 'favorites',
  imports: [CommonModule, DogsListComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class FavoritesComponent implements AfterViewInit {
  @Input() dogsByIds: { [key: string]: Dog } = {};
  @Input() favorites: string[] = [];
  @Output() updateFavorites = new EventEmitter<string>();
  @Output() updateSelectedDog = new EventEmitter<Event | Dog>();

  matchedDog: Dog | null = null;
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
    if (!this.favorites.length) {
      return;
    }
    this.dogService.matchDogs(this.favorites).subscribe({
      next: res => this.matchedDog = this.dogsByIds[res.match],
      error: err => {
        console.error(err);
        alert('Failed to generate a match.');
      }
    });
  }
  convertFavoritesToDogsList(): Dog[] {
    let result: Dog[] = [];
    for (let d_idx in this.favorites) {
      result.push(this.dogsByIds[this.favorites[d_idx]])
    }
    return result;
  }
  toggleFavorite(id: string | Event): void {
    if (typeof id != 'string') id = id.toString();
    this.updateFavorites.emit(id);
  }
  selectedDogUpdated(dog: Event | Dog): void {
    this.updateSelectedDog.emit(dog);
  }
}
