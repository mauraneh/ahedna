import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

describe('PrivacyPolicyComponent', () => {
  it('creates the component', () => {
    TestBed.configureTestingModule({
      imports: [PrivacyPolicyComponent],
      providers: [
        provideRouter([]),
        provideTranslocoTesting(),
        { provide: AuthService, useClass: NoopAuthServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(PrivacyPolicyComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });
});
