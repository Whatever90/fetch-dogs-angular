import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from './pagination/pagination.component';
import { FavoritesComponent } from '../shared/favorites/favorites.component';
import { DogsListComponent } from '../shared/dogs-list/dogs-list.component';
import { DogPreviewComponent } from '../shared/dog-preview/dog-preview.component';
import { LocationMapSearchComponent } from './location-map-search/location-map-search.component';
import { FilterComponent } from '../shared/filter/filter.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule, FormsModule, PaginationComponent, FavoritesComponent, DogsListComponent, DogPreviewComponent, LocationMapSearchComponent, FilterComponent, HttpClientTestingModule,
        RouterTestingModule,
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
