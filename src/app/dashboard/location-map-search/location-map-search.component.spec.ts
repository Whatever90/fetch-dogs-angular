import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LocationMapSearchComponent } from './location-map-search.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('LocationMapSearchComponent', () => {
  let component: LocationMapSearchComponent;
  let fixture: ComponentFixture<LocationMapSearchComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [LocationMapSearchComponent, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: { top: '47.9', left: '-122.0', bottom: '47.8', right: '-121.9' } },
            queryParams: of({ top: '47.9', left: '-122.0', bottom: '47.8', right: '-121.9' })
          }
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LocationMapSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and initialize the map', () => {
    expect(component).toBeTruthy();
    expect(component['map']).toBeDefined();
  });
});
