import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FilterComponent } from './filter.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;
  let router: Router;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FilterComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        CommonModule
      ],
      providers: [{
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParams: {} },
          queryParams: of({})
        }
      }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the filter component', () => {
    expect(component).toBeTruthy();
  });

  it('should update query params on applyFilters()', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.ageMin = 3;
    component.ageMax = 11;
    component.breeds = [];
    component.page = 0;
    component.pageSize = 11;
  
    component.applyFilters();
  
    const navigateArgs = navigateSpy.calls.mostRecent().args;
    expect(navigateArgs[0]).toEqual([]);
    expect(navigateArgs[1]).toEqual(jasmine.objectContaining({
      queryParams: jasmine.objectContaining({
        ageMin: 3,
        ageMax: 11,
        breeds: [],
        page: 0,
        pageSize: 11
      }),
      queryParamsHandling: 'merge'
    }));
  });
  
});
