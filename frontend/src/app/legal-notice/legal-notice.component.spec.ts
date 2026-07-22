import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LegalNoticeComponent } from './legal-notice.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

describe('LegalNoticeComponent', () => {
  it('creates the component', () => {
    TestBed.configureTestingModule({
      imports: [LegalNoticeComponent],
      providers: [
        provideRouter([]),
        provideTranslocoTesting(),
        { provide: AuthService, useClass: NoopAuthServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(LegalNoticeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
