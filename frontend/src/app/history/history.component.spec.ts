import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';
import { HistoryComponent } from './history.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

const validHistoryTranslation = {
  history: {
    hero: { badge: '', title: '', subtitle: '', highlights: [] },
    loadingLabel: '',
    emptyState: { title: '', body: '', ctaLabel: '' },
    labels: {
      chapter: '',
      visual: '',
      source: '',
      photoPlaceholder: '',
      tones: { archive: 'Archive', document: 'Document', ceremony: 'Cérémonie', memory: 'Mémoire' },
    },
    cta: { title: '', body: '', actionLabel: '' },
    chapters: [
      { id: 'c2', title: 'Chapitre 2', content: '', chapterOrder: 2, yearStart: 1965, yearEnd: 1975, media: [] },
      { id: 'c1', title: 'Chapitre 1', content: '', chapterOrder: 1, yearStart: 1962, yearEnd: 1962, media: [] },
    ],
  },
};

class TranslocoTestingLoader implements TranslocoLoader {
  getTranslation() {
    return of(validHistoryTranslation);
  }
}

function createComponent(loader: new (...args: never[]) => TranslocoLoader = TranslocoTestingLoader) {
  TestBed.configureTestingModule({
    imports: [HistoryComponent],
    providers: [
      provideRouter([]),
      provideTranslocoTesting(loader),
      { provide: AuthService, useClass: NoopAuthServiceStub },
    ],
  });

  return TestBed.createComponent(HistoryComponent);
}

describe('HistoryComponent', () => {
  it('sorts chapters by chapterOrder and marks the first one visible and active', fakeAsync(() => {
    const fixture = createComponent();
    fixture.detectChanges();
    tick(200);

    const component = fixture.componentInstance;
    expect(component.chapters.map((chapter) => chapter.chapterOrder)).toEqual([1, 2]);
    expect(component.isChapterVisible(1)).toBe(true);
    expect(component.isChapterAnimated(1)).toBe(true);
    expect(component.activeChapter).toBe(1);
    expect(component.loading).toBe(false);

    fixture.destroy();
  }));

  it('clears the content when the translation payload has no chapters array', () => {
    class InvalidLoader implements TranslocoLoader {
      getTranslation() {
        return of({ history: { chapters: 'not-an-array' } });
      }
    }

    const fixture = createComponent(InvalidLoader);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.loading).toBe(false);
    expect(component.content).toBeNull();
    expect(component.chapters).toEqual([]);
  });

  it('recovers when the translation stream errors out', () => {
    class FailingLoader implements TranslocoLoader {
      getTranslation() {
        return throwError(() => new Error('network error'));
      }
    }

    const fixture = createComponent(FailingLoader);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.loading).toBe(false);
    expect(component.content).toBeNull();
  });

  it('extracts the numeric chapter id from an element id', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.extractChapterId('chapter-3')).toBe(3);
    expect(component.extractChapterId('something-else')).toBeNull();
  });

  it('formats the chapter number with a leading zero', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.formatChapterNumber(3)).toBe('03');
    expect(fixture.componentInstance.formatChapterNumber(12)).toBe('12');
  });

  it('formats the chapter period as a single year or a range', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.getChapterPeriod({ yearStart: 1962, yearEnd: 1962 } as any)).toBe('1962');
    expect(component.getChapterPeriod({ yearStart: 1962, yearEnd: 0 } as any)).toBe('1962');
    expect(component.getChapterPeriod({ yearStart: 1962, yearEnd: 1975 } as any)).toBe(
      '1962 - 1975'
    );
  });

  it('resolves the highlight label from the loaded content, or an empty string otherwise', fakeAsync(() => {
    const fixture = createComponent();
    fixture.detectChanges();
    tick(200);

    expect(fixture.componentInstance.getHighlightLabel('archive')).toBe('Archive');

    fixture.destroy();
  }));

  it('returns an empty string for the highlight label before the content has loaded', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.getHighlightLabel('archive')).toBe('');
  });

  it('returns an empty media array when a chapter has none', () => {
    const fixture = createComponent();
    expect(fixture.componentInstance.getChapterMedia({} as any)).toEqual([]);
  });

  it('computes the path progress between two chapters based on their visibility', fakeAsync(() => {
    const fixture = createComponent();
    fixture.detectChanges();
    tick(200);

    const component = fixture.componentInstance;
    // Only chapter 1 (order 1) is visible right after load.
    expect(component.getPathProgress(0)).toBe(50);

    component.visibleChapters.add(2);
    expect(component.getPathProgress(0)).toBe(100);

    fixture.destroy();
  }));

  it('does nothing when trying to scroll to a chapter that is not rendered', () => {
    const fixture = createComponent();
    const scrollToSpy = spyOn(window, 'scrollTo');

    fixture.componentInstance.scrollToChapter(99);

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls to the target chapter element and updates the active chapter', () => {
    const fixture = createComponent();
    const element = document.createElement('div');
    element.id = 'chapter-1';
    document.body.appendChild(element);
    const scrollToSpy = spyOn(window, 'scrollTo') as jasmine.Spy;

    fixture.componentInstance.scrollToChapter(1);

    expect(scrollToSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.activeChapter).toBe(1);

    document.body.removeChild(element);
  });

  it('removes the scroll listener when the component is destroyed', fakeAsync(() => {
    const fixture = createComponent();
    fixture.detectChanges();
    tick(200);

    const removeListenerSpy = spyOn(window, 'removeEventListener').and.callThrough();
    fixture.destroy();

    expect(removeListenerSpy).toHaveBeenCalledWith('scroll', jasmine.any(Function));
  }));
});
