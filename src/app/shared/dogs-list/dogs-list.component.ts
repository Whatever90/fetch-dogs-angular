import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Dog } from '../../dog.model';
import { DogImageFallbackDirective } from '../dog-image-fallback.directive';
import { BreedDescriptionService, normalizeBreedName } from '../../breed-description.service';

@Component({
  selector: 'dogs-list',
  imports: [CommonModule, DogImageFallbackDirective],
  templateUrl: './dogs-list.component.html',
  styleUrl: './dogs-list.component.css'
})
export class DogsListComponent implements OnInit {
  @Input() loadingStatus: boolean = false;
  @Input() favoritesMode: boolean = false;
  @Input() dogs: Dog[] = [];
  @Input() favorites: string[] = [];
  @Output() updateFavorites = new EventEmitter<string>();
  @Output() updateSelectedDog = new EventEmitter<Dog>();
  @Output() updateHoveredDog = new EventEmitter<Dog>();
  private breedDescriptions: Record<string, string> = {};
  private breedDescriptionsLoading = true;
  private breedDescriptionsFailed = false;

  constructor(private breedDescriptionService: BreedDescriptionService) { }

  ngOnInit(): void {
    this.breedDescriptionService.getDescriptions().subscribe({
      next: descriptions => {
        this.breedDescriptions = descriptions;
        this.breedDescriptionsLoading = false;
      },
      error: error => {
        console.error(error);
        this.breedDescriptionsLoading = false;
        this.breedDescriptionsFailed = true;
      }
    });
  }

  getBreedDescription(breed: string): string {
    const description = this.breedDescriptions[normalizeBreedName(breed)];
    if (description) return description;
    if (this.breedDescriptionsLoading) return 'Loading breed description…';
    if (this.breedDescriptionsFailed) return 'Breed description could not be loaded.';
    return 'No description is available for this breed.';
  }

  toggleFavorite(id: string | Event): void {
    if (typeof id != 'string') id = id.toString();
    this.updateFavorites.emit(id);
  }
  selectDog(dog: Dog): void {
    this.updateSelectedDog.emit(dog);
  }
  hoverDog(dog: Dog): void {
    this.updateHoveredDog.emit(dog);
  }
}
