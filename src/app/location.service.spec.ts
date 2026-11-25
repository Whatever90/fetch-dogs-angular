import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(LocationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('reuses recent results for an identical location search page', () => {
    const criteria = {
      geoBoundingBox: { top: 38, left: -123, bottom: 37, right: -122 },
      size: 100,
      from: 0
    };
    const expected = {
      results: [{
        zip_code: '94952',
        latitude: 38.2324,
        longitude: -122.6367,
        city: 'Petaluma',
        state: 'CA',
        county: 'Sonoma'
      }],
      total: 1
    };

    service.searchLocations(criteria).subscribe();
    httpTestingController.expectOne(req => req.url.endsWith('/locations/search')).flush(expected);

    let cachedResponse: typeof expected | undefined;
    service.searchLocations(criteria).subscribe(response => cachedResponse = response);

    expect(cachedResponse).toEqual(expected);
    httpTestingController.expectNone(req => req.url.endsWith('/locations/search'));
  });

  it('fetches location details in API-sized batches', async () => {
    const zipCodes = Array.from({ length: 101 }, (_, index) => String(10000 + index));
    const locationsPromise = service.postLocations(zipCodes);
    const firstBatch = httpTestingController.expectOne(req => req.url.endsWith('/locations'));
    expect(firstBatch.request.body.length).toBe(100);
    firstBatch.flush(zipCodes.slice(0, 100).map(zip_code => ({
      zip_code,
      latitude: 0,
      longitude: 0,
      city: 'Test city',
      state: 'CA',
      county: 'Test county'
    })));
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    const secondBatch = httpTestingController.expectOne(req => req.url.endsWith('/locations'));
    expect(secondBatch.request.body).toEqual(['10100']);
    secondBatch.flush([{
      zip_code: '10100',
      latitude: 0,
      longitude: 0,
      city: 'Test city',
      state: 'CA',
      county: 'Test county'
    }]);

    expect(Object.keys(await locationsPromise).length).toBe(101);
  });
});
