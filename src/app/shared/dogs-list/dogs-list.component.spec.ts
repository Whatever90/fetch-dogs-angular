import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DogsListComponent } from './dogs-list.component';
import { BreedDescriptionService } from '../../breed-description.service';

describe('DogsListComponent', () => {
  let component: DogsListComponent;
  let fixture: ComponentFixture<DogsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogsListComponent],
      providers: [{
        provide: BreedDescriptionService,
        useValue: {
          getDescriptions: () => of({ airedale: 'Airedales are intelligent, energetic, and loyal.' })
        }
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DogsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the supplied placeholder after a dog photo fails to load', () => {
    component.dogs = [{ id: 'sunny', name: 'Sunny', img: 'https://example.invalid/sunny.jpg' }];
    fixture.detectChanges();

    const image: HTMLImageElement = fixture.nativeElement.querySelector('.dog-photo');
    image.dispatchEvent(new Event('error'));

    expect(image.src).toContain('dog-placeholder.png');
  });

  it('associates the breed with its description tooltip', () => {
    component.dogs = [{ id: 'sunny', name: 'Sunny', breed: 'Airedale' }];
    fixture.detectChanges();

    const breed = fixture.nativeElement.querySelector('.dog-breed-trigger') as HTMLElement;
    const tooltip = fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement;

    expect(breed.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip.textContent).toContain('Airedales are intelligent, energetic, and loyal.');
  });
});
