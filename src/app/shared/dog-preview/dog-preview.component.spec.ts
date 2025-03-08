import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DogPreviewComponent } from './dog-preview.component';

describe('DogPreviewComponent', () => {
  let component: DogPreviewComponent;
  let fixture: ComponentFixture<DogPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DogPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DogPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
