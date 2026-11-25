import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FavoritesComponent } from './favorites.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { Dog } from '../../dog.model';

describe('FavoritesComponent', () => {
  let component: FavoritesComponent;
  let fixture: ComponentFixture<FavoritesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FavoritesComponent,
        HttpClientTestingModule, // Provides HttpClient for testing
        RouterTestingModule,
        CommonModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('omits saved dogs whose details have not loaded yet', () => {
    const availableDog: Dog = { id: 'available', name: 'Alize' };
    component.favorites = ['available', 'missing'];
    component.dogsByIds = { available: availableDog };

    expect(component.convertFavoritesToDogsList()).toEqual([availableDog]);
    expect(component.missingFavoriteIds).toEqual(['missing']);
  });

  it('shows a recovery action instead of passing missing dogs to the list', () => {
    component.favorites = ['missing'];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Some saved dogs are unavailable');
    expect(fixture.nativeElement.querySelector('dogs-list')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });
});
