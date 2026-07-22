import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MembershipComponent } from './membership.component';
import { AuthService } from '../core/services/auth.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';
import { NoopAuthServiceStub } from '../testing/noop-auth-service-stub';

function createComponent() {
  TestBed.configureTestingModule({
    imports: [MembershipComponent],
    providers: [
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: NoopAuthServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(MembershipComponent);
  fixture.detectChanges();
  return fixture;
}

describe('MembershipComponent', () => {
  it('fills the custom amount when a preset donation amount is selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.selectDonationAmount(50);

    expect(component.customAmount).toBe('50');
    expect(component.isValidAmount()).toBe(true);
  });

  it('rejects an empty or non-positive custom amount', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.isValidAmount()).toBe(false);

    component.customAmount = '0';
    expect(component.isValidAmount()).toBe(false);

    component.customAmount = '-5';
    expect(component.isValidAmount()).toBe(false);
  });

  it('opens the HelloAsso donation link in a new tab for a valid amount', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const openSpy = spyOn(window, 'open');

    component.customAmount = '25';
    component.handleDonation();

    expect(openSpy).toHaveBeenCalledWith(component.helloAssoDonUrl, '_blank', 'noopener');
  });

  it('does not open any link when the custom amount is invalid', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const openSpy = spyOn(window, 'open');

    component.customAmount = '0';
    component.handleDonation();

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('opens the HelloAsso adhesion link', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const openSpy = spyOn(window, 'open');

    component.handleAdhesion();

    expect(openSpy).toHaveBeenCalledWith(component.helloAssoAdhesionUrl, '_blank', 'noopener');
  });
});
