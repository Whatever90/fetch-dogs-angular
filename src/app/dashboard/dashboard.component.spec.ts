import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FavoritesComponent } from '../shared/favorites/favorites.component';
import { DogsListComponent } from '../shared/dogs-list/dogs-list.component';
import { DogPreviewComponent } from '../shared/dog-preview/dog-preview.component';
import { LocationMapSearchComponent } from './location-map-search/location-map-search.component';
import { FilterComponent } from '../shared/filter/filter.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { DogService } from '../dog.service';
import { LocationService } from '../location.service';
import { AuthService } from '../auth.service';
import { FavoritesService } from '../favorites.service';
import { Location } from '../location.model';

describe('DashboardComponent', () => {
  let queryParams: BehaviorSubject<Record<string, unknown>>;
  let searchDogs: jasmine.Spy;
  let searchLocations: jasmine.Spy;
  let getDogs: jasmine.Spy;

  beforeEach(async () => {
    queryParams = new BehaviorSubject<Record<string, unknown>>({});
    searchDogs = jasmine.createSpy('searchDogs').and.returnValue(of({ resultIds: [], total: 0 }));
    getDogs = jasmine.createSpy('getDogs').and.returnValue(of([]));
    searchLocations = jasmine.createSpy('searchLocations').and.returnValue(of({
      results: [{
        zip_code: '94103',
        latitude: 37.77,
        longitude: -122.41,
        city: 'San Francisco',
        state: 'CA',
        county: 'San Francisco'
      } as Location],
      total: 1
    }));

    await TestBed.configureTestingModule({
      imports: [
        CommonModule, FormsModule, FavoritesComponent, DogsListComponent, DogPreviewComponent, LocationMapSearchComponent, FilterComponent, HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: queryParams.asObservable(), snapshot: { queryParams: {} } } },
        { provide: DogService, useValue: { searchDogs, getDogs } },
        { provide: LocationService, useValue: { searchLocations, postLocations: () => Promise.resolve({}) } },
        { provide: AuthService, useValue: { logout: () => of('OK') } },
        { provide: FavoritesService, useValue: { getFavorites: () => [], toggleFavorite: () => undefined } }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('keeps ZIP filtering across searches and refreshes it when the map bounds change', async () => {
    const secondLocation: Location = {
      zip_code: '94612',
      latitude: 37.8,
      longitude: -122.27,
      city: 'Oakland',
      state: 'CA',
      county: 'Alameda'
    };
    searchLocations.and.returnValues(
      of({ results: [{ zip_code: '94103', latitude: 37.77, longitude: -122.41, city: 'San Francisco', state: 'CA', county: 'San Francisco' }], total: 1 }),
      of({ results: [secondLocation], total: 1 })
    );

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    const bounds = { top: '45', left: '0', bottom: '44', right: '1' };
    queryParams.next({ ...bounds, page: '0' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(searchLocations).toHaveBeenCalledTimes(1);
    expect(searchLocations.calls.mostRecent().args[0].geoBoundingBox).toEqual({
      top: 45,
      left: 0,
      bottom: 44,
      right: 1
    });
    expect(searchDogs.calls.mostRecent().args[3]).toEqual(['94103']);

    queryParams.next({ ...bounds, page: '1' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(searchLocations).toHaveBeenCalledTimes(1);
    expect(searchDogs.calls.mostRecent().args[3]).toEqual(['94103']);
    expect(searchDogs.calls.mostRecent().args.length).toBe(6);

    queryParams.next({ ...bounds, left: '-1', right: '2', page: '2' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(searchLocations).toHaveBeenCalledTimes(2);
    expect(searchDogs.calls.mostRecent().args[3]).toEqual(['94612']);
  });

  it('loads ZIP codes from every location-search page for broad map areas', async () => {
    const firstPage: Location[] = Array.from({ length: 100 }, (_, index) => ({
      zip_code: String(10000 + index),
      latitude: 37,
      longitude: -122,
      city: 'Test city',
      state: 'CA',
      county: 'Test county'
    }));
    const lastPage: Location = {
      zip_code: '94952',
      latitude: 38,
      longitude: -121,
      city: 'Another city',
      state: 'CA',
      county: 'Another county'
    };
    searchLocations.and.returnValues(
      of({ results: firstPage, total: 101 }),
      of({ results: [lastPage], total: 101 })
    );

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    queryParams.next({ top: '39', left: '-123', bottom: '36', right: '-120', page: '0' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(searchLocations).toHaveBeenCalledTimes(2);
    expect(searchLocations.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({ size: 100, from: 0 }));
    expect(searchLocations.calls.argsFor(1)[0]).toEqual(jasmine.objectContaining({ size: 100, from: 100 }));
    expect(component.zipCodes).toEqual([...firstPage.map(location => location.zip_code), lastPage.zip_code]);
    expect(searchDogs.calls.mostRecent().args[3]).toEqual(component.zipCodes);
  });

  it('does not drop the area filter when a map lookup returns no ZIP codes', async () => {
    searchLocations.and.returnValue(of({ results: [], total: 0 }));
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    const bounds = { top: '45', left: '0', bottom: '44', right: '1' };
    queryParams.next({ ...bounds, page: '0' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    queryParams.next({ ...bounds, page: '1' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(searchLocations).toHaveBeenCalledTimes(1);
    expect(searchDogs).not.toHaveBeenCalled();
    expect(component.dogsTotalCount).toBe(0);
    expect(component.loadingStatus).toBeFalse();
  });

  it('ignores stale location results after the map moves to a newer area', async () => {
    const firstResponse = new Subject<{ results: Location[], total: number }>();
    const secondResponse = new Subject<{ results: Location[], total: number }>();
    searchLocations.and.returnValues(firstResponse, secondResponse);

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    queryParams.next({ top: '45', left: '-123', bottom: '44', right: '-122', page: '0' });
    queryParams.next({ top: '42', left: '-122', bottom: '41', right: '-121', page: '0' });
    expect(searchLocations).toHaveBeenCalledTimes(2);

    secondResponse.next({
      results: [{
        zip_code: '94612',
        latitude: 37.8,
        longitude: -122.27,
        city: 'Oakland',
        state: 'CA',
        county: 'Alameda'
      }],
      total: 1
    });
    secondResponse.complete();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(component.zipCodes).toEqual(['94612']);

    firstResponse.next({
      results: [{
        zip_code: '94103',
        latitude: 37.77,
        longitude: -122.41,
        city: 'San Francisco',
        state: 'CA',
        county: 'San Francisco'
      }],
      total: 1
    });
    firstResponse.complete();
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(component.zipCodes).toEqual(['94612']);
    expect(component.criteria.geoBoundingBox).toEqual({
      top: 42,
      left: -122,
      bottom: 41,
      right: -121
    });
    expect(searchDogs.calls.count()).toBe(1);
    expect(searchDogs.calls.mostRecent().args[3]).toEqual(['94612']);
  });

  it('ignores stale dog results after the map area changes', async () => {
    const firstSearch = new Subject<{ resultIds: string[], total: number }>();
    const secondSearch = new Subject<{ resultIds: string[], total: number }>();
    searchDogs.and.returnValues(firstSearch, secondSearch);

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    queryParams.next({ top: '45', left: '-123', bottom: '44', right: '-122', page: '0' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    queryParams.next({ top: '42', left: '-122', bottom: '41', right: '-121', page: '0' });
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    secondSearch.next({ resultIds: ['current-area-dog'], total: 40 });
    secondSearch.complete();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    firstSearch.next({ resultIds: ['old-area-dog'], total: 10 });
    firstSearch.complete();
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    expect(component.dogs.map(dog => dog.id)).toEqual(['current-area-dog']);
    expect(component.dogsTotalCount).toBe(40);
  });

  it('places fetched details after cached dogs without leaving duplicate placeholders', async () => {
    const cachedDog = { id: 'cached-dog', name: 'Cached', img: 'cached.jpg' };
    const fetchedDog = { id: 'fetched-dog', name: 'Fetched', img: 'fetched.jpg' };
    getDogs.and.returnValue(of([fetchedDog]));

    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    component.dogsByIds[cachedDog.id] = cachedDog;

    await component.getDogs([cachedDog.id, fetchedDog.id], 0);

    expect(component.dogs).toEqual([cachedDog, fetchedDog]);
    expect(component.dogs.map(dog => dog.id)).toEqual(['cached-dog', 'fetched-dog']);
  });
});
