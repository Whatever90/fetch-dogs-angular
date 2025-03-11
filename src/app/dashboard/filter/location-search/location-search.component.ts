import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../../location.service';
import { Location } from '../../../location.model';

@Component({
  selector: 'location-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-search.component.html'
})
export class LocationSearchComponent {
  // Define search criteria, with geoBoundingBox as an empty object initially.
  criteria: {
    city?: string;
    states?: string[];
    geoBoundingBox: {
      top?: number;
      left?: number;
      bottom?: number;
      right?: number;
    };
    size?: number;
    from?: number;
  } = { geoBoundingBox: {} };

  // Temporary string for states input (comma separated)
  statesInput: string = '';

  // Returned locations and total count
  locations: Location[] | null = null;
  total: number = 0;
  error: string = '';

  constructor(private locationService: LocationService) { }

  searchLocations(): void {
    // Process the states input: split by comma, trim spaces, and filter out empties.
    if (this.statesInput) {
      this.criteria.states = this.statesInput.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
      this.criteria.states = undefined;
    }

    // Optionally set default page size if not provided.
    if (!this.criteria.size) {
      this.criteria.size = 25;
    }

    // Call the location search API endpoint.
    this.locationService.searchLocations(this.criteria).subscribe({
      next: res => {
        this.locations = res.results;
        this.total = res.total;
        this.error = '';
      },
      error: err => {
        console.error(err);
        this.error = 'Failed to search locations.';
        this.locations = null;
      }
    });
  }
  async test() {
    let result =  await this.locationService.postLocations(['06519', '34483', '44607', '78295', '64659', '64428', '54641', '31501', '11978', '07201', '04955', '67855', '27243', '12153', '78368', '48267', '62985', '01260', '66101', '64653', '18462', '31004', '30293', '32004', '71857']);
    console.log(result)
  }
}
