import { Component, AfterViewInit, Output, EventEmitter, OnDestroy, input, Input, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { Dog } from '../../dog.model';

@Component({
  selector: 'location-map-search',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="map"></div>
    <div class="map-location-control">
      <button type="button" class="btn btn-light" (click)="centerOnUserLocation()"
        [disabled]="locating">
        <span aria-hidden="true">◎</span>
        {{ locating ? 'Finding you…' : 'Use my location' }}
      </button>
      <p *ngIf="locationError" class="location-error" role="status">{{ locationError }}</p>
    </div>
  `,
  styleUrls: ['./location-map-search.component.css'],
})
export class LocationMapSearchComponent implements AfterViewInit, OnDestroy {
  @Input() dogs: Dog[] = [];
  @Input() dogToPreview: Dog | null = null;
  @Output() selectedDogEmitter = new EventEmitter<Dog>()

  private map!: L.Map;
  private moveEndHandler: any;
  private destroyed = false;
  private skipNextMoveEndSearch = false;
  mapReady = false;
  locating = false;
  locationError = '';
  private dogMarkers: Map<string, L.Marker> = new Map();
  private dogsByMarker = new Map<L.Marker, Dog[]>();
  private popupRenderers = new Map<L.Marker, (dogIndex: number) => void>();
  constructor(private router: Router, private route: ActivatedRoute) { }

  ngAfterViewInit(): void {
    // Read query parameters from the URL
    const queryParams = this.route.snapshot.queryParams;
    let zoom = 13; // default zoom
    if (queryParams?.['zoom']) {
      zoom = Number(queryParams['zoom']);
    }

    const hasBoundingBox = ['top', 'left', 'bottom', 'right'].every(
      key => queryParams?.[key] !== undefined && queryParams[key] !== ''
    );
    if (hasBoundingBox) {
      // Parse the values as numbers
      const top = Number(queryParams['top']);
      const left = Number(queryParams['left']);
      const bottom = Number(queryParams['bottom']);
      const right = Number(queryParams['right']);
      if ([top, left, bottom, right].every(Number.isFinite)) {
        const savedCenter = { latitude: (top + bottom) / 2, longitude: (left + right) / 2 };
        if (queryParams?.['mapView'] === 'manual') {
          this.initializeMap(savedCenter.latitude, savedCenter.longitude, zoom);
        } else {
          this.initializeSavedViewOrLocateUser(savedCenter, zoom);
        }
        return;
      }
    }
    this.locateInitialPosition(zoom);
  }

  private initializeSavedViewOrLocateUser(
    savedCenter: { latitude: number; longitude: number },
    zoom: number
  ): void {
    if (!navigator.permissions?.query) {
      this.initializeMap(savedCenter.latitude, savedCenter.longitude, zoom);
      return;
    }

    navigator.permissions.query({ name: 'geolocation' }).then(
      permission => {
        if (this.destroyed) return;
        if (permission.state === 'granted') {
          this.locateInitialPosition(zoom, savedCenter);
        } else {
          this.initializeMap(savedCenter.latitude, savedCenter.longitude, zoom);
        }
      },
      () => {
        if (this.destroyed) return;
        this.locationError = 'Could not check location permission. Use the location button to retry.';
        this.initializeMap(savedCenter.latitude, savedCenter.longitude, zoom);
      }
    );
  }

  centerOnUserLocation(): void {
    if (!navigator.geolocation || !this.mapReady) {
      this.locationError = 'Location is unavailable. Check your browser permissions and try again.';
      return;
    }

    this.locationError = '';
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      position => {
        if (this.destroyed) return;
        this.locating = false;
        this.locationError = '';
        this.map.setView([position.coords.latitude, position.coords.longitude], 13);
        this.updateURLqueryParamsWithCoordinates(this.map.getBounds(), this.map.getZoom(), true);
      },
      error => {
        if (this.destroyed) return;
        this.locating = false;
        this.locationError = this.getLocationError(error);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  private locateInitialPosition(
    zoom: number,
    savedCenter?: { latitude: number; longitude: number }
  ): void {
    if (!navigator.geolocation) {
      this.locationError = savedCenter
        ? 'Location is unavailable. Keeping the saved map area.'
        : 'Location is unavailable. Showing the default map area instead.';
      this.initializeMap(savedCenter?.latitude ?? 37.7749, savedCenter?.longitude ?? -122.4194, zoom);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        if (this.destroyed) return;
        this.initializeMap(position.coords.latitude, position.coords.longitude, zoom);
      },
      error => {
        if (this.destroyed) return;
        this.locationError = savedCenter
          ? `${this.getLocationError(error)} Keeping the saved map area.`
          : `${this.getLocationError(error)} Showing the default map area instead.`;
        this.initializeMap(savedCenter?.latitude ?? 37.7749, savedCenter?.longitude ?? -122.4194, zoom);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  private getLocationError(error: GeolocationPositionError): string {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Location permission is blocked. Allow location access in your browser and try again.';
    }
    if (error.code === error.TIMEOUT) {
      return 'Your location took too long to find. Please try again.';
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'Your browser could not determine your location. Check device location services and try again.';
    }
    return 'Your location could not be determined. Check your device settings and try again.';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dogs'] && this.map) {
      // Update markers whenever the dogs input changes
      this.updateMarkers();
    }
    if (changes['dogToPreview'] && this.map && this.dogToPreview) {
      // When dogToPreview changes, open the corresponding marker's popup.
      this.openPopupForDog(this.dogToPreview.id);
    }
  }
  private initializeMap(lat: number, lon: number, zoom: number): void {
    this.map = L.map('map', { minZoom: 10 }).setView([lat, lon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.mapReady = true;

    // Initially update URL query params based on current bounds and zoom
    this.updateURLqueryParamsWithCoordinates(this.map.getBounds(), this.map.getZoom());
    this.map.on('autopanstart', () => this.skipNextMoveEndSearch = true);

    // Listen to moveend event to track location changes on the fly
    this.moveEndHandler = () => {
      if (this.skipNextMoveEndSearch) {
        this.skipNextMoveEndSearch = false;
        return;
      }
      const bounds = this.map.getBounds();
      const currentZoom = this.map.getZoom();
      this.updateURLqueryParamsWithCoordinates(bounds, currentZoom, true);
    };

    this.map.on('moveend', this.moveEndHandler);
  }

  updateURLqueryParamsWithCoordinates(bounds: L.LatLngBounds, zoom: number, userSelected = false): void {
    const top = bounds.getNorth();
    const left = bounds.getWest();
    const bottom = bounds.getSouth();
    const right = bounds.getEast();
    // Update URL query parameters with the new bounding box and zoom
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        top,
        left,
        bottom,
        right,
        zoom,
        page: null,
        ...(userSelected ? { mapView: 'manual' } : {})
      },
      queryParamsHandling: 'merge'
    });
  }


  private updateMarkers(): void {
    new Set(this.dogMarkers.values()).forEach(marker => this.map.removeLayer(marker));
    this.dogMarkers.clear();
    this.dogsByMarker.clear();
    this.popupRenderers.clear();

    const dogsByLocation = new Map<string, Dog[]>();
    for (const dog of this.dogs) {
      const location = dog.location;
      if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) continue;
      const key = `${location.latitude},${location.longitude}`;
      const group = dogsByLocation.get(key) || [];
      group.push(dog);
      dogsByLocation.set(key, group);
    }

    for (const dogs of dogsByLocation.values()) {
      const location = dogs[0].location;
      if (!location) continue;

      const markerOptions: L.MarkerOptions = {
        title: dogs.length > 1 ? `${dogs.length} dogs at this location` : `${dogs[0].name || 'Dog'} location`,
        zIndexOffset: 500,
        riseOnHover: true,
        riseOffset: 1000
      };
      markerOptions.icon = this.createPinIcon(dogs.length);
      const marker = L.marker([location.latitude, location.longitude], markerOptions).addTo(this.map);

      this.dogsByMarker.set(marker, dogs);
      dogs.forEach(dog => this.dogMarkers.set(dog.id, marker));
      marker.bindPopup(this.createPopupContent(marker, dogs, 0), {
        autoPan: true,
        autoPanPadding: [24, 24]
      });

      let closeTimeout: ReturnType<typeof setTimeout> | undefined;
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => {
        closeTimeout = setTimeout(() => marker.closePopup(), 2000);
      });
      marker.on('popupopen', () => {
        const popupContainer = marker.getPopup()?.getElement()?.querySelector('.leaflet-popup-content-wrapper');
        if (!popupContainer) return;
        popupContainer.addEventListener('mouseenter', () => {
          if (closeTimeout) clearTimeout(closeTimeout);
        });
        popupContainer.addEventListener('mouseleave', () => {
          closeTimeout = setTimeout(() => marker.closePopup(), 300);
        });
      });
    }
  }

  private createPinIcon(count: number): L.DivIcon {
    return L.divIcon({
      className: 'dog-map-pin',
      html: count > 1
        ? `<span>${count}</span>`
        : '<span class="dog-map-pin-single" aria-hidden="true"></span>',
      iconSize: [36, 42],
      iconAnchor: [18, 42],
      popupAnchor: [0, -38]
    });
  }

  private createPopupContent(marker: L.Marker, dogs: Dog[], dogIndex: number): HTMLElement {
    const popupContent = document.createElement('div');
    popupContent.className = 'dog-map-popup';

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'dog-map-popup-preview';
    let activeDogIndex = dogIndex;
    previewButton.addEventListener('click', () => this.selectDog(dogs[activeDogIndex]));
    const image = document.createElement('img');
    previewButton.append(image);
    popupContent.append(previewButton);

    const name = document.createElement('p');
    name.className = 'dog-map-popup-name';
    popupContent.append(name);

    const breed = document.createElement('p');
    breed.className = 'dog-map-popup-detail';
    popupContent.append(breed);

    const city = document.createElement('p');
    city.className = 'dog-map-popup-detail';
    popupContent.append(city);

    let position: HTMLSpanElement | undefined;
    let previousButton: HTMLButtonElement | undefined;
    let nextButton: HTMLButtonElement | undefined;
    if (dogs.length > 1) {
      const navigation = document.createElement('div');
      navigation.className = 'dog-map-popup-navigation';
      previousButton = document.createElement('button');
      previousButton.type = 'button';
      previousButton.setAttribute('aria-label', 'Previous dog at this location');
      previousButton.textContent = '‹';
      previousButton.addEventListener('click', event => {
        L.DomEvent.stopPropagation(event);
        this.setActiveDog(marker, activeDogIndex - 1);
      });

      position = document.createElement('span');
      position.className = 'dog-map-popup-position';
      position.setAttribute('aria-live', 'polite');

      nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.setAttribute('aria-label', 'Next dog at this location');
      nextButton.textContent = '›';
      nextButton.addEventListener('click', event => {
        L.DomEvent.stopPropagation(event);
        this.setActiveDog(marker, activeDogIndex + 1);
      });

      navigation.append(previousButton, position, nextButton);
      popupContent.append(navigation);
    }

    const placeholder = new URL('dog-placeholder.png', document.baseURI).href;
    image.addEventListener('error', () => image.src = placeholder, { once: true });
    const renderDog = (index: number) => {
      const dog = dogs[index];
      activeDogIndex = index;
      previewButton.setAttribute('aria-label', `View details for ${dog.name || 'dog'}`);
      image.src = dog.img || placeholder;
      image.alt = dog.name || 'Dog available for adoption';
      name.textContent = dog.name || 'Dog';
      breed.textContent = dog.breed || '';
      breed.hidden = !dog.breed;
      city.textContent = dog.location?.city || '';
      if (position) position.textContent = `${index + 1} of ${dogs.length}`;
      if (previousButton) previousButton.disabled = index === 0;
      if (nextButton) nextButton.disabled = index === dogs.length - 1;
    };
    this.popupRenderers.set(marker, renderDog);
    renderDog(dogIndex);
    return popupContent;
  }

  private setActiveDog(marker: L.Marker, dogIndex: number): void {
    const dogs = this.dogsByMarker.get(marker);
    if (!dogs || dogIndex < 0 || dogIndex >= dogs.length) return;
    this.popupRenderers.get(marker)?.(dogIndex);
  }

  // Method to open the popup for a specific dog
  openPopupForDog(dogId: string): void {
    const marker = this.dogMarkers.get(dogId);
    if (!marker) return;
    const dogs = this.dogsByMarker.get(marker) || [];
    const dogIndex = dogs.findIndex(dog => dog.id === dogId);
    if (dogIndex >= 0) this.setActiveDog(marker, dogIndex);
    marker.openPopup();
  }
  selectDog(dog: Dog) {
    this.selectedDogEmitter.emit(dog as Dog)
  }
  ngOnDestroy(): void {
    // Clean up the map instance to prevent memory leaks
    this.destroyed = true;
    if (this.map) {
      this.map.remove();
    }
  }
}
