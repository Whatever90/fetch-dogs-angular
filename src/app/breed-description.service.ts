import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, shareReplay, throwError } from 'rxjs';

interface BreedApiPage {
  data: Array<{
    attributes: {
      name: string;
      description: string;
    };
  }>;
  meta?: {
    pagination?: {
      current: number;
      next?: number;
    };
  };
}

const BREED_ALIASES: Record<string, string> = {
  'airedale': 'airedale terrier',
  'appenzeller': 'appenzeller sennenhund',
  'basset': 'basset hound',
  'bluetick': 'bluetick coonhound',
  'boston bull': 'boston terrier',
  'brabancon griffon': 'brussels griffon',
  'brittany spaniel': 'brittany',
  'cairn': 'cairn terrier',
  'cardigan': 'cardigan welsh corgi',
  'chow': 'chow chow',
  'clumber': 'clumber spaniel',
  'dandie dinmont': 'dandie dinmont terrier',
  'doberman': 'doberman pinscher',
  'english springer': 'english springer spaniel',
  'entlebucher': 'entlebucher mountain dog',
  'eskimo dog': 'american eskimo dog',
  'german shepherd': 'german shepherd dog',
  'groenendael': 'belgian sheepdog',
  'japanese spaniel': 'japanese chin',
  'kelpie': 'australian kelpie',
  'leonberg': 'leonberger',
  'lhasa': 'lhasa apso',
  'malamute': 'alaskan malamute',
  'malinois': 'belgian malinois',
  'maltese dog': 'maltese',
  'mexican hairless': 'xoloitzcuintli',
  'miniature poodle': 'poodle (miniature)',
  'pekinese': 'pekingese',
  'pembroke': 'pembroke welsh corgi',
  'redbone': 'redbone coonhound',
  'scotch terrier': 'scottish terrier',
  'standard poodle': 'poodle (standard)',
  'toy poodle': 'poodle (toy)',
  'walker hound': 'treeing walker coonhound',
  'wire-haired fox terrier': 'wire fox terrier'
};

export function normalizeBreedName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

@Injectable({
  providedIn: 'root'
})
export class BreedDescriptionService {
  private readonly apiUrl = 'https://dogapi.dog/api/v2/breeds';
  private readonly pageSize = 100;
  private descriptionsRequest?: Observable<Record<string, string>>;

  constructor(private http: HttpClient) { }

  getDescriptions(): Observable<Record<string, string>> {
    if (!this.descriptionsRequest) {
      this.descriptionsRequest = this.fetchPage(1).pipe(
        expand(page => {
          const pagination = page.meta?.pagination;
          if (!pagination ||
            !Number.isInteger(pagination.current) ||
            pagination.current < 1) {
            return throwError(() => new Error(
              `Dog breed API returned invalid pagination metadata: ${JSON.stringify(pagination)}.`
            ));
          }
          if (pagination.next === undefined) return EMPTY;
          if (!Number.isInteger(pagination.next) || pagination.next <= pagination.current) {
            return throwError(() => new Error(
              `Dog breed API returned an invalid next page: ${JSON.stringify(pagination)}.`
            ));
          }
          return this.fetchPage(pagination.next);
        }),
        reduce((descriptions, page) => {
          page.data.forEach(({ attributes }) => {
            if (attributes?.name && attributes.description) {
              descriptions[normalizeBreedName(attributes.name)] = attributes.description;
            }
          });
          return descriptions;
        }, {} as Record<string, string>),
        map(descriptions => {
          Object.entries(BREED_ALIASES).forEach(([breed, apiBreed]) => {
            const description = descriptions[normalizeBreedName(apiBreed)];
            if (description) {
              descriptions[normalizeBreedName(breed)] = description;
            }
          });
          return descriptions;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.descriptionsRequest;
  }

  private fetchPage(pageNumber: number): Observable<BreedApiPage> {
    const params = new HttpParams()
      .set('page[number]', pageNumber)
      .set('page[size]', this.pageSize)
      .set('fields[breed]', 'name,description');
    return this.http.get<BreedApiPage>(this.apiUrl, { params });
  }
}
