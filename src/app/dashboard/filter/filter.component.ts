import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DogService } from '../../dog.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'filter',
  imports: [FormsModule, CommonModule],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.css'
})
export class FilterComponent {

  breeds: string[] = [];
  selectedBreeds: string[] = [];
  sortOrder: string = 'asc';
  page: number = 0;
  error: string = '';

  constructor(private dogService: DogService, private router: Router, private route: ActivatedRoute) {
  }
  ngOnInit() {
    this.loadBreeds();
    const queryParams = this.route.snapshot.queryParams;
    if(queryParams['page']) {
      this.page = queryParams['page']
    }
    if(queryParams['breeds']) {
      this.selectedBreeds = typeof queryParams['breeds'] == 'string' ? [queryParams['breeds']] : queryParams['breeds'];
    }
    if(queryParams['sortOrder']) {
      this.sortOrder = queryParams['sortOrder']
    }
  }
  async loadBreeds() {
    this.dogService.getBreeds().subscribe({
      next: data => this.breeds = data as string[],
      error: err => {
        console.error(err);
        if(err.status == 401) {
          this.router.navigate(['/'])
        }
        this.error = 'Failed to load breeds.';
      }
    });
  }
  applyFilters(): void {
    // Update the URL query params with a comma-separated string of selected breeds.
    this.router.navigate([], {
      queryParams: { breeds: this.selectedBreeds, page: 0 },
      queryParamsHandling: 'merge'
    });
  }
  onSortChange(order: string): void {
    this.sortOrder = order;
    this.page = 0;
    this.router.navigate([], {
      queryParams: { page: 0, sortOrder: order },
      queryParamsHandling: 'merge'
    });
  }
}
