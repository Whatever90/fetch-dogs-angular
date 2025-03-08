import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Modal } from 'bootstrap';
import { Dog } from '../../dog.model';

@Component({
  selector: 'dog-preview',
  imports: [CommonModule],
  templateUrl: './dog-preview.component.html',
  styleUrl: './dog-preview.component.css'
})
export class DogPreviewComponent implements AfterViewInit {
  @Input() modalMode: boolean = false;
  @Input() favorites: string[] = [];
  @Output() updateFavorites = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  dog: Dog | undefined;
  private modalInstance!: Modal;
  favsModal!: Modal
  constructor() { };
  ngAfterViewInit(): void {
    const modalEl = document.getElementById('dogImageExpandModal');
    const favsModal = document.getElementById('favoritesModal');
    if (favsModal) {
      this.favsModal = new Modal(favsModal);
    }
    if (modalEl) {
      this.modalInstance = new Modal(modalEl);
      modalEl.addEventListener('hidden.bs.modal', () => {
        this.closed.emit();
      });
    }
  }
  openModal(dog: Dog): void {
    if (this.modalInstance) {
      this.dog = dog;
      this.modalInstance.show();
    }
  }
  toggleFavorite(id: string): void {
    this.updateFavorites.emit(id);
  }
}
