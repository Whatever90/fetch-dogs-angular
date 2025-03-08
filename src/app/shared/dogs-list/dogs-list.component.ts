import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Dog } from '../../dog.model';

@Component({
  selector: 'dogs-list',
  imports: [CommonModule,],
  templateUrl: './dogs-list.component.html',
  styleUrl: './dogs-list.component.css'
})
export class DogsListComponent {
  @Input() loadingStatus: boolean = false;
  @Input() dogs: Dog[] = [];
  @Input() favorites: string[] = [];
  @Output() updateFavorites = new EventEmitter<string>();
  @Output() updateSelectedDog = new EventEmitter<Dog>();
  constructor() { }
  toggleFavorite(id: string | Event): void {
    if (typeof id != 'string') id = id.toString();
    this.updateFavorites.emit(id);
  }
  selectDog(dog: Dog): void {
    this.updateSelectedDog.emit(dog);
  }
}
