import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { LocationMapSearchComponent } from './location-map-search.component';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import * as L from 'leaflet';

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
            snapshot: { queryParams: { top: '1', left: '0', bottom: '0', right: '1', mapView: 'manual' } },
            queryParams: of({ top: '1', left: '0', bottom: '0', right: '1', mapView: 'manual' })
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
    expect(component['map'].getMinZoom()).toBe(10);
    expect(component['map'].getCenter().lat).toBeCloseTo(0.5);
    expect(component['map'].getCenter().lng).toBeCloseTo(0.5);
  });

  it('updates the search bounds after the first map movement', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const updateBounds = spyOn(component, 'updateURLqueryParamsWithCoordinates').and.callThrough();

    component['map'].setView([2, 2], 13, { animate: false });

    expect(updateBounds).toHaveBeenCalledTimes(1);
    const navigate = (router.navigate as jasmine.Spy).calls.mostRecent();
    expect(navigate.args[1]?.queryParams?.['page']).toBeNull();
  });

  it('does not refetch the area when an edge popup auto-pans the map', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component['map'].fire('autopanstart');
    component['moveEndHandler']();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component['skipNextMoveEndSearch']).toBeFalse();
  });

  it('centers the map on the browser location when requested', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    const position = {
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: 0
    } as GeolocationPosition;
    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(success => success(position));

    component.centerOnUserLocation();

    const navigate = (router.navigate as jasmine.Spy).calls.mostRecent();
    const queryParams = navigate.args[1]?.queryParams;
    expect((queryParams['top'] + queryParams['bottom']) / 2).toBeCloseTo(40.7128);
    expect((queryParams['left'] + queryParams['right']) / 2).toBeCloseTo(-74.006);
    expect(component.locationError).toBe('');
  });

  it('uses granted device location instead of an old saved map area', async () => {
    const route = TestBed.inject(ActivatedRoute);
    fixture.destroy();
    route.snapshot.queryParams = { top: '38', left: '-123', bottom: '37', right: '-122' };

    spyOn(navigator.permissions, 'query').and.returnValue(
      Promise.resolve({ state: 'granted' } as PermissionStatus)
    );
    const position = {
      coords: {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: 0
    } as GeolocationPosition;
    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(success => success(position));

    fixture = TestBed.createComponent(LocationMapSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['map'].getCenter().lat).toBeCloseTo(40.7128);
    expect(component['map'].getCenter().lng).toBeCloseTo(-74.006);
  });

  it('explains when the browser cannot determine a location', () => {
    expect(component['getLocationError']({
      code: 2,
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    } as GeolocationPositionError)).toContain('Check device location services');
  });

  it('groups dogs at the same pin and lets the popup browse each dog', () => {
    const location = {
      zip_code: '95570',
      latitude: 0.5,
      longitude: 0.5,
      city: 'Scotia',
      state: 'CA',
      county: 'Humboldt'
    };
    component.dogs = [
      { id: 'miles', name: 'Miles', img: 'miles.jpg', location },
      { id: 'rafaela', name: 'Rafaela', img: 'rafaela.jpg', location }
    ];
    component['updateMarkers']();

    const marker = component['dogMarkers'].get('miles');
    expect(marker).toBeDefined();
    expect(component['dogMarkers'].get('rafaela')).toBe(marker);
    expect(marker?.options.title).toBe('2 dogs at this location');
    expect(marker?.options.zIndexOffset).toBe(500);
    expect(marker?.options.riseOnHover).toBeTrue();
    expect(marker?.getPopup()?.options.autoPan).toBeTrue();
    expect((marker?.options.icon as L.DivIcon).options.className).toBe('dog-map-pin');
    expect((marker?.options.icon as L.DivIcon).options.html).toBe('<span>2</span>');

    const popup = marker?.getPopup();
    marker?.openPopup();
    const firstDog = popup?.getContent() as HTMLElement;
    expect(firstDog.textContent).toContain('Miles');
    expect(firstDog.querySelector('.dog-map-popup-position')?.textContent).toBe('1 of 2');

    firstDog.querySelector<HTMLButtonElement>('[aria-label="Next dog at this location"]')?.click();
    const nextDog = popup?.getContent() as HTMLElement;
    expect(marker?.isPopupOpen()).toBeTrue();
    expect(nextDog.textContent).toContain('Rafaela');
    expect(nextDog.querySelector('.dog-map-popup-position')?.textContent).toBe('2 of 2');
  });

  it('uses the same pin styling for a single dog without a group count', () => {
    component.dogs = [{
      id: 'miles',
      name: 'Miles',
      location: {
        zip_code: '95570',
        latitude: 41.06,
        longitude: -124.14,
        city: 'Scotia',
        state: 'CA',
        county: 'Humboldt'
      }
    }];
    component['updateMarkers']();

    const marker = component['dogMarkers'].get('miles');
    const icon = marker?.options.icon as L.DivIcon;
    expect(icon.options.className).toBe('dog-map-pin');
    expect(icon.options.html).toContain('dog-map-pin-single');
    const popupContent = marker?.getPopup()?.getContent() as HTMLElement;
    expect(popupContent.querySelector('.dog-map-popup-position')).toBeNull();
  });
});
