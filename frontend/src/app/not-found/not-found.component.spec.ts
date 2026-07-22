import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

describe('NotFoundComponent', () => {
  it('creates the component and exposes a main landmark with a link back home', () => {
    TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        provideRouter([]),
        provideTranslocoTesting(),
        { provide: AuthService, useClass: NoopAuthServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('main#main-content')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/"]')).toBeTruthy();
  });
});
