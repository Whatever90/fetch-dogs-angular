import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DogService } from '../../dog.service';
import { CommonModule } from '@angular/common';
import { Location } from '../../location.model';
import { Modal } from 'bootstrap';

@Component({
  selector: 'filter',
  imports: [FormsModule, CommonModule],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.css']
})
export class FilterComponent {

  breeds: string[] = [];
  selectedBreeds: string[] = [];
  sortOrder: string = 'asc';
  sortField: 'breed' | 'name' | 'age' = 'name';
  error: string = '';
  criteria: {
    city?: string;
    states?: string[];
    geoBoundingBox?: { top: number, left: number, bottom: number, right: number };
    size?: number;
    from?: number;
  } = {};
  pageSize: number = 25;
  ageMin: number = 0;
  ageMax: number = 31;
  previousValuesStorage: { [key: string]: any } = {};
  private modalInstance!: Modal;

  constructor(private dogService: DogService, private router: Router, private route: ActivatedRoute) {
  }
  ngOnInit() {
    const modalEl = document.getElementById('filterSettingsModal');
    if (modalEl) {
      this.modalInstance = new Modal(modalEl);
    }
    this.loadBreeds();
    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['breeds']) {
      this.selectedBreeds = typeof queryParams['breeds'] == 'string' ? [queryParams['breeds']] : queryParams['breeds'];
    }
    if (queryParams['sortOrder']) {
      this.sortOrder = queryParams['sortOrder']
    }
    if (queryParams['sortField']) {
      this.sortField = queryParams['sortField']
    }
    if (queryParams['ageMin']) {
      this.ageMin = queryParams['ageMin'];
    }
    if (queryParams['ageMax']) {
      this.ageMax = queryParams['ageMax'];
    }
    if (queryParams['pageSize']) {
      this.pageSize = queryParams['pageSize'];
    }
  }
  openModal(): void {
    if (this.modalInstance) {
      this.modalInstance.show();
      this.previousValuesStorage = {
        selectedBreeds: this.selectedBreeds,
        ageMin: this.ageMin,
        ageMax: this.ageMax,
        pageSize: this.pageSize,
        sortField: this.sortField,
        sortOrder: this.sortOrder
      }
    }
  }

  closeModal(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }
  async loadBreeds() {
    this.dogService.getBreeds().subscribe({
      next: data => this.breeds = data as string[],
      error: err => {
        console.error(err);
        if (err.status == 401) {
          this.router.navigate(['/login'])
        }
        this.error = 'Failed to load breeds.';
      }
    });
  }
  applyFilters(): void {
    if (this.ageMin > this.ageMax) return;
    this.router.navigate([], {
      queryParams: { breeds: this.selectedBreeds, page: 0, ageMin: this.ageMin, ageMax: this.ageMax, pageSize: this.pageSize },
      queryParamsHandling: 'merge'
    });
  }
  onSortChange(order: string): void {
    this.sortOrder = order;
    this.router.navigate([], {
      queryParams: { page: 0, sortOrder: order, pageSize: this.pageSize },
      queryParamsHandling: 'merge'
    });
  }
  save(): void {
    this.router.navigate([], {
      queryParams: { 
        breeds: this.selectedBreeds, 
        page: 0, 
        ageMin: this.ageMin, 
        ageMax: this.ageMax, 
        pageSize: this.pageSize,
        sortOrder: this.sortOrder,
        sortField: this.sortField
      },
      queryParamsHandling: 'merge'
    });
    this.closeModal();
  }
  cancel(): void {
    Object.assign(this, this.previousValuesStorage);
    this.closeModal();
  }
}
