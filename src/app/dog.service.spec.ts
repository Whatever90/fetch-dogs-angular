import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DogService } from './dog.service';

describe('DogService', () => {
  let service: DogService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(DogService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('keeps zero-valued age filters and repeated location filters in search requests', () => {
    service.searchDogs(['Beagle', 'Pug'], 'age', 'asc', ['10001', '10002'], 0, 0)
      .subscribe(response => expect(response.total).toBe(0));

    const request = httpTestingController.expectOne(req => req.url.endsWith('/dogs/search'));

    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.params.get('size')).toBe('100');
    expect(request.request.params.getAll('breeds')).toEqual(['Beagle', 'Pug']);
    expect(request.request.params.getAll('zipCodes')).toEqual(['10001', '10002']);
    expect(request.request.params.get('from')).toBe('0');
    expect(request.request.params.get('ageMin')).toBe('0');
    expect(request.request.params.get('ageMax')).toBe('0');
    request.flush({ resultIds: [], total: 0 });
  });

  it('fetches and combines every search page', () => {
    const firstPageIds = Array.from({ length: 100 }, (_, index) => `dog-${index}`);
    let result: { resultIds: string[], total: number } | undefined;
    service.searchDogs([], 'name', 'asc', [], null, null).subscribe(response => result = response);

    const firstPage = httpTestingController.expectOne(req =>
      req.url.endsWith('/dogs/search') && req.params.get('from') === '0'
    );
    expect(firstPage.request.params.get('size')).toBe('100');
    firstPage.flush({ resultIds: firstPageIds, total: 101 });

    const secondPage = httpTestingController.expectOne(req =>
      req.url.endsWith('/dogs/search') && req.params.get('from') === '100'
    );
    secondPage.flush({ resultIds: ['dog-100'], total: 101 });

    expect(result?.resultIds.length).toBe(101);
    expect(result?.total).toBe(101);
    expect(result?.resultIds[100]).toBe('dog-100');
  });

  it('reuses recent results for an identical dog search', () => {
    const expected = { resultIds: ['dog-1'], total: 1 };
    service.searchDogs([], 'name', 'asc', ['94952'], null, null).subscribe();
    httpTestingController.expectOne(req => req.url.endsWith('/dogs/search')).flush(expected);

    let cachedResponse: typeof expected | undefined;
    service.searchDogs([], 'name', 'asc', ['94952'], null, null)
      .subscribe(response => cachedResponse = response);

    expect(cachedResponse).toEqual(expected);
    httpTestingController.expectNone(req => req.url.endsWith('/dogs/search'));
  });

  it('fetches dog details in API-sized batches', () => {
    const ids = Array.from({ length: 101 }, (_, index) => `dog-${index}`);
    let dogs: { id: string }[] | undefined;
    service.getDogs(ids).subscribe(response => dogs = response);

    const firstBatch = httpTestingController.expectOne(req => req.url.endsWith('/dogs'));
    expect(firstBatch.request.body.length).toBe(100);
    firstBatch.flush(ids.slice(0, 100).map(id => ({ id })));

    const secondBatch = httpTestingController.expectOne(req => req.url.endsWith('/dogs'));
    expect(secondBatch.request.body).toEqual(['dog-100']);
    secondBatch.flush([{ id: 'dog-100' }]);

    expect(dogs?.map(dog => dog.id)).toEqual(ids);
  });
});
