import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationMapSearchComponent } from './location-map-search.component';

describe('LocationMapSearchComponent', () => {
  let component: LocationMapSearchComponent;
  let fixture: ComponentFixture<LocationMapSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationMapSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocationMapSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
