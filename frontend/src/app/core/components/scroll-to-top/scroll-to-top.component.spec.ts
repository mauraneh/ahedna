import { TestBed } from '@angular/core/testing';
import { ScrollToTopComponent } from './scroll-to-top.component';
import { provideTranslocoTesting } from '../../../testing/transloco-testing';

function createComponent() {
  TestBed.configureTestingModule({
    imports: [ScrollToTopComponent],
    providers: [
      provideTranslocoTesting(),
    ],
  });

  return TestBed.createComponent(ScrollToTopComponent);
}

describe('ScrollToTopComponent', () => {
  afterEach(() => {
    window.scrollTo(0, 0);
  });

  it('hides the button while the page has not been scrolled past the threshold', () => {
    const fixture = createComponent();
    fixture.detectChanges();

    expect(fixture.componentInstance.showButton).toBe(false);
  });

  it('shows the button once the scroll position passes 300px', () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    spyOnProperty(window, 'scrollY').and.returnValue(400);
    component.checkScrollPosition();

    expect(component.showButton).toBe(true);
  });

  it('removes the scroll listener on destroy', () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const removeListenerSpy = spyOn(window, 'removeEventListener').and.callThrough();

    fixture.destroy();

    expect(removeListenerSpy).toHaveBeenCalledWith('scroll', jasmine.any(Function));
  });

  it('scrolls the window back to the top', () => {
    const fixture = createComponent();
    fixture.detectChanges();
    const scrollToSpy = spyOn(window, 'scrollTo') as jasmine.Spy;

    fixture.componentInstance.scrollToTop();

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
