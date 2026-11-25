import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'img[dogImageFallback]',
  standalone: true
})
export class DogImageFallbackDirective {
  constructor(private element: ElementRef<HTMLImageElement>) { }

  @HostListener('error')
  usePlaceholder(): void {
    const image = this.element.nativeElement;
    const placeholder = new URL('dog-placeholder.png', document.baseURI).href;
    if (image.src !== placeholder) {
      image.src = placeholder;
    }
  }
}
