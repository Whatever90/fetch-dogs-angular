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
  `,
  styles: [`
    #map { width: 100%; height: 100vh; }
  `]
})
export class LocationMapSearchComponent implements AfterViewInit, OnDestroy {
  @Input() dogs: Dog[] = [];
  @Input() dogToPreview: Dog | null = null;
  private markers: L.Marker[] = [];

  private map!: L.Map;
  private moveEndHandler: any;
  private skipInitialMoveEnd: boolean = true;
  private dogMarkers: Map<string, L.Marker> = new Map();
  constructor(private router: Router, private route: ActivatedRoute) { }

  ngAfterViewInit(): void {
    // Read query parameters from the URL
    const queryParams = this.route.snapshot.queryParams;
    let zoom = 13; // default zoom
    if (queryParams?.['zoom']) {
      zoom = Number(queryParams['zoom']);
    }

    if (queryParams?.['top'] && queryParams['left'] && queryParams['bottom'] && queryParams['right']) {
      // Parse the values as numbers
      const top = Number(queryParams['top']);
      const left = Number(queryParams['left']);
      const bottom = Number(queryParams['bottom']);
      const right = Number(queryParams['right']);
      // Calculate the center as the average of top & bottom, left & right
      const centerLat = (top + bottom) / 2;
      const centerLon = (left + right) / 2;
      this.initializeMap(centerLat, centerLon, zoom);
    } else {
      // No query params: use geolocation if available, or fallback default (e.g., San Francisco)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.initializeMap(position.coords.latitude, position.coords.longitude, zoom);
          },
          (error) => {
            console.error('Geolocation error:', error);
            this.initializeMap(37.7749, -122.4194, zoom);
          }
        );
      } else {
        this.initializeMap(37.7749, -122.4194, zoom);
      }
    }
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
    this.map = L.map('map').setView([lat, lon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Initially update URL query params based on current bounds and zoom
    this.updateURLqueryParamsWithCoordinates(this.map.getBounds(), this.map.getZoom());

    // Listen to moveend event to track location changes on the fly
    this.moveEndHandler = () => {
      // Skip initial moveend event if needed
      if (this.skipInitialMoveEnd) {
        this.skipInitialMoveEnd = false;
        return;
      }
      const bounds = this.map.getBounds();
      const currentZoom = this.map.getZoom();
      this.updateURLqueryParamsWithCoordinates(bounds, currentZoom);
    };

    this.map.on('moveend', this.moveEndHandler);
  }

  updateURLqueryParamsWithCoordinates(bounds: L.LatLngBounds, zoom: number): void {
    const top = bounds.getNorth();
    const left = bounds.getWest();
    const bottom = bounds.getSouth();
    const right = bounds.getEast();
    // Update URL query parameters with the new bounding box and zoom
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { top, left, bottom, right, zoom },
      queryParamsHandling: 'merge'
    });
  }


  private updateMarkers(): void {
    // Remove old markers
    this.dogMarkers.forEach(marker => this.map.removeLayer(marker));
    this.dogMarkers.clear();

    // Add new markers for each dog
    for (const dog of this.dogs) {
      if (dog.location && typeof dog.location.latitude === 'number' && typeof dog.location.longitude === 'number') {
        const marker = L.marker([dog.location.latitude, dog.location.longitude]).addTo(this.map);

        // Create popup options with autoPan disabled and our custom offset.
        // const popupOptions: L.PopupOptions = {
        //   autoPan: false,
        //   offset: L.point(offsetX, offsetY)
        // };
        const popupOptions: L.PopupOptions = {
          autoPan: false
        };
        // Create popup content including a clickable button.
        const popupContent = `
          <div style="text-align: center;">
            <img src="${dog.img}" alt="${dog.name}" style="width: 100px; height: auto; border-radius: 4px;" />
            <p style="margin: 0; font-size: 0.9rem;"><strong>${dog.name}</strong></p>
            <p style="margin: 0; font-size: 0.8rem;">ZIP: ${dog.zip_code}</p>
            <button id="previewBtn-${dog.id}" class="btn btn-sm btn-primary">Preview</button>
          </div>
        `;

        // Bind the popup using the custom options.
        marker.bindPopup(popupContent, popupOptions);
        this.dogMarkers.set(dog.id, marker);

        // Set up hover events for the marker.
        let closeTimeout: any;
        marker.on('mouseover', () => {
          marker.openPopup();
        });
        marker.on('mouseout', () => {
          closeTimeout = setTimeout(() => {
            marker.closePopup();
          }, 2000);
        });

        // Attach event listeners when the popup is opened.
        marker.on('popupopen', () => {
          const popupContainer = document.querySelector('.leaflet-popup-content-wrapper');
          if (popupContainer) {
            // Cancel closing when mouse enters the popup.
            popupContainer.addEventListener('mouseenter', () => {
              if (closeTimeout) {
                clearTimeout(closeTimeout);
              }
            });
            // Close the popup after a delay when mouse leaves the popup.
            popupContainer.addEventListener('mouseleave', () => {
              closeTimeout = setTimeout(() => {
                marker.closePopup();
              }, 300);
            });
            // Attach a click listener to the Preview button.
            const btn = document.getElementById(`previewBtn-${dog.id}`);
            if (btn) {
              btn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent immediate popup close.
                // Call your preview function, e.g., this.openDogPreview(dog);
              });
            }
          }
        });
      }
    }
  }


  // Method to open the popup for a specific dog
  openPopupForDog(dogId: string): void {
    const marker = this.dogMarkers.get(dogId);
    if (marker) {
      marker.openPopup();
    }
  }

  ngOnDestroy(): void {
    // Clean up the map instance to prevent memory leaks
    if (this.map) {
      this.map.remove();
    }
  }
}
