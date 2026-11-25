import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BreedDescriptionService, normalizeBreedName } from './breed-description.service';

describe('BreedDescriptionService', () => {
  let service: BreedDescriptionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(BreedDescriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads all pages and matches alternate Fetch API breed names', async () => {
    const descriptionsPromise = firstValueFrom(service.getDescriptions());
    const firstPage = httpMock.expectOne(request =>
      request.url === 'https://dogapi.dog/api/v2/breeds' &&
      request.params.get('page[number]') === '1' &&
      request.params.get('page[size]') === '100' &&
      request.params.get('fields[breed]') === 'name,description'
    );
    firstPage.flush({
      data: [
        { attributes: { name: 'Affenpinscher', description: 'Small companion breed.' } }
      ],
      meta: { pagination: { current: 1, next: 2 } }
    });

    const secondPage = httpMock.expectOne(request =>
      request.url === 'https://dogapi.dog/api/v2/breeds' &&
      request.params.get('page[number]') === '2'
    );
    secondPage.flush({
      data: [
        { attributes: { name: 'Airedale Terrier', description: 'Airedale description.' } }
      ],
      meta: { pagination: { current: 2 } }
    });

    const descriptions = await descriptionsPromise;
    expect(descriptions[normalizeBreedName('Affenpinscher')]).toBe('Small companion breed.');
    expect(descriptions[normalizeBreedName('Airedale')]).toBe('Airedale description.');
  });

  it('reuses the completed response instead of requesting the API again', async () => {
    const firstRequest = firstValueFrom(service.getDescriptions());
    httpMock.expectOne(request => request.url === 'https://dogapi.dog/api/v2/breeds').flush({
      data: [
        { attributes: { name: 'Affenpinscher', description: 'Small companion breed.' } }
      ],
      meta: { pagination: { current: 1, last: 1 } }
    });

    const firstResponse = await firstRequest;
    const secondResponse = await firstValueFrom(service.getDescriptions());

    expect(secondResponse).toBe(firstResponse);
    httpMock.expectNone('https://dogapi.dog/api/v2/breeds');
  });
});
