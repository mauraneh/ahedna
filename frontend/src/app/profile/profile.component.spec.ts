import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProfileComponent } from './profile.component';
import { AuthService, User } from '../core/services/auth.service';
import { AddressAutocompleteService } from '../core/services/address-autocomplete.service';
import { provideTranslocoTesting } from '../testing/transloco-testing';

class AddressAutocompleteServiceStub {
  searchResult: any = of([]);
  searchByPostalCodeResult: any = of([]);

  search() {
    return this.searchResult;
  }

  searchByPostalCode() {
    return this.searchByPostalCodeResult;
  }

  formatLocation(suggestion: any) {
    return suggestion.label;
  }
}

const testUser: User = {
  id: 'user-1',
  email: 'membre@example.org',
  first_name: 'Jean',
  last_name: 'Dupont',
  role: 'membre',
};

class AuthServiceStub {
  updateSession = jasmine.createSpy('updateSession');
  logout = jasmine.createSpy('logout');

  isAuthenticated() {
    return true;
  }

  currentUser() {
    return testUser;
  }

  hasRole() {
    return false;
  }
}

function createComponent() {
  TestBed.configureTestingModule({
    imports: [ProfileComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTranslocoTesting(),
      { provide: AuthService, useClass: AuthServiceStub },
      { provide: AddressAutocompleteService, useClass: AddressAutocompleteServiceStub },
    ],
  });

  const fixture = TestBed.createComponent(ProfileComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

function flushInitialLoad(httpMock: HttpTestingController) {
  httpMock
    .expectOne(`${environment.apiUrl}/profile/me`)
    .flush({ profile: testUser, membership: null });
  httpMock.expectOne(`${environment.apiUrl}/profile/documents`).flush({ documents: [] });
}

describe('ProfileComponent', () => {
  afterEach(() => {
    // forkJoin cancels its sibling request when one source errors (see the
    // "loading the profile fails" case below), which is expected, not a leak.
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  it('loads the profile and documents on init and patches the form', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    expect(component.loading).toBe(false);
    expect(component.profile).toEqual(testUser);
    expect(component.profileForm.value.email).toBe('membre@example.org');
    expect(component.profileForm.value.first_name).toBe('Jean');
  });

  it('does not submit the profile form when it is invalid', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ email: 'not-an-email' });
    component.saveProfile();

    httpMock.expectNone(`${environment.apiUrl}/profile/me`);
    expect(component.savingProfile).toBe(false);
  });

  it('updates the session after a successful profile save', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    component.profileForm.patchValue({ email: 'membre@example.org' });
    component.saveProfile();

    const putRequest = httpMock.expectOne(`${environment.apiUrl}/profile/me`);
    expect(putRequest.request.method).toBe('PUT');
    putRequest.flush({
      message: 'Profile updated successfully',
      profile: testUser,
      membership: null,
      token: 'new-token',
    });

    expect(component.savingProfile).toBe(false);
    expect(component.profileMessage).toBe('Profile updated successfully');
    expect(authService.updateSession).toHaveBeenCalledWith(testUser, 'new-token');
  });

  it('rejects a new password shorter than 8 characters without calling the API', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.passwordForm.setValue({ current_password: 'oldpass', new_password: 'short' });
    component.updatePassword();

    httpMock.expectNone(`${environment.apiUrl}/profile/password`);
    expect(component.savingPassword).toBe(false);
  });

  it('requires the confirmation email to match the current email before deleting the account', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    component.deleteAccountForm.setValue({ confirm_email: 'someone-else@example.org' });

    component.deleteAccount();

    httpMock.expectNone(`${environment.apiUrl}/profile/me`);
    expect(authService.logout).not.toHaveBeenCalled();
    expect(component.accountError).not.toBe('');
  });

  it('deletes the account and logs out when the confirmation email matches', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    component.deleteAccountForm.setValue({ confirm_email: testUser.email });

    component.deleteAccount();

    const deleteRequest = httpMock.expectOne(`${environment.apiUrl}/profile/me`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush({ message: 'Account deleted successfully' });

    expect(authService.logout).toHaveBeenCalled();
  });

  it('surfaces the server error when loading the profile fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();

    // forkJoin cancels the sibling `documents` request once `profile/me` errors,
    // so only the failing request can be flushed here.
    httpMock
      .expectOne(`${environment.apiUrl}/profile/me`)
      .flush({ error: 'Unavailable' }, { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.profileError).toBe('Unavailable');
    expect(fixture.componentInstance.loading).toBe(false);
  });

  it('surfaces the server error when saving the profile fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ email: 'membre@example.org' });
    component.saveProfile();

    httpMock
      .expectOne(`${environment.apiUrl}/profile/me`)
      .flush({ error: 'Email already registered' }, { status: 400, statusText: 'Bad Request' });

    expect(component.profileError).toBe('Email already registered');
    expect(component.savingProfile).toBe(false);
  });

  it('updates the password and resets the form on success', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.passwordForm.setValue({ current_password: 'oldpassword', new_password: 'newlongpassword' });
    component.updatePassword();

    httpMock
      .expectOne(`${environment.apiUrl}/profile/password`)
      .flush({ message: 'Password updated successfully' });

    expect(component.passwordMessage).toBe('Password updated successfully');
    expect(component.passwordForm.value.current_password).toBeFalsy();
    expect(component.savingPassword).toBe(false);
  });

  it('surfaces the server error when updating the password fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.passwordForm.setValue({ current_password: 'wrongpassword', new_password: 'newlongpassword' });
    component.updatePassword();

    httpMock
      .expectOne(`${environment.apiUrl}/profile/password`)
      .flush({ error: 'Current password is incorrect' }, { status: 400, statusText: 'Bad Request' });

    expect(component.passwordError).toBe('Current password is incorrect');
    expect(component.savingPassword).toBe(false);
  });

  it('surfaces the server error when deleting the account fails', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    component.deleteAccountForm.setValue({ confirm_email: testUser.email });
    component.deleteAccount();

    httpMock
      .expectOne(`${environment.apiUrl}/profile/me`)
      .flush({ error: 'Cannot delete' }, { status: 400, statusText: 'Bad Request' });

    expect(component.accountError).toBe('Cannot delete');
    expect(component.deletingAccount).toBe(false);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('does not search for an address while the input is too short', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const searchSpy = spyOn(addressAutocomplete, 'search').and.callThrough();

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ address_line1: 'Pa' });
    component.onAddressInput();

    expect(searchSpy).not.toHaveBeenCalled();
    expect(component.addressSuggestions).toEqual([]);
  });

  it('searches for an address and ignores a stale response', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const stale = new Subject<any[]>();
    addressAutocomplete.searchResult = stale.asObservable();

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ address_line1: 'Rue de la Paix' });
    component.onAddressInput();

    addressAutocomplete.searchResult = of([{ label: 'Rue de la Paix, Paris' }]);
    component.onAddressInput();

    stale.next([{ label: 'Résultat périmé' }]);

    expect(component.addressSuggestions).toEqual([{ label: 'Rue de la Paix, Paris' } as any]);
  });

  it('clears the city suggestions when the postal code is not a valid 5-digit code', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ postal_code: '2400' });
    component.onPostalCodeInput();

    expect(component.citySuggestions).toEqual([]);
  });

  it('auto-fills the city and defaults the country when a postal code matches', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    addressAutocomplete.searchByPostalCodeResult = of([{ city: 'Périgueux', postalCode: '24000' }]);

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ postal_code: '24000' });
    component.onPostalCodeInput();

    expect(component.profileForm.value.city).toBe('Périgueux');
    expect(component.profileForm.value.country).toBe('France');
  });

  it('ignores a stale postal code lookup response', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    const stale = new Subject<any[]>();
    addressAutocomplete.searchByPostalCodeResult = stale.asObservable();

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ postal_code: '24000' });
    component.onPostalCodeInput();

    addressAutocomplete.searchByPostalCodeResult = of([]);
    component.profileForm.patchValue({ postal_code: '75000' });
    component.onPostalCodeInput();

    stale.next([{ city: 'Résultat périmé', postalCode: '24000' }]);

    expect(component.profileForm.value.city).not.toBe('Résultat périmé');
  });

  it('does not search by city while the input is too short', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ city: 'Pa' });
    component.onCityInput();

    expect(component.citySuggestions).toEqual([]);
  });

  it('searches by city and keeps only municipality suggestions', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const addressAutocomplete = TestBed.inject(
      AddressAutocompleteService
    ) as unknown as AddressAutocompleteServiceStub;
    addressAutocomplete.searchResult = of([
      { label: 'Rue de Périgueux', kind: 'street' },
      { label: 'Périgueux', kind: 'municipality' },
    ]);

    const component = fixture.componentInstance;
    component.profileForm.patchValue({ city: 'Perigueux' });
    component.onCityInput();

    expect(component.citySuggestions.length).toBe(1);
    expect(component.citySuggestions[0].kind).toBe('municipality');
  });

  it('selects a non-municipality address suggestion and fills in the street line', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.selectAddressSuggestion({
      label: '12 Rue de la Paix, Périgueux',
      kind: 'street',
      postalCode: '24000',
      city: 'Périgueux',
    } as any);

    expect(component.profileForm.value.address_line1).toBe('12 Rue de la Paix');
    expect(component.profileForm.value.postal_code).toBe('24000');
    expect(component.profileForm.value.country).toBe('France');
    expect(component.addressSuggestions).toEqual([]);
  });

  it('selects a municipality address suggestion and clears the street line', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.selectAddressSuggestion({
      label: 'Périgueux',
      kind: 'municipality',
      postalCode: '24000',
      city: 'Périgueux',
    } as any);

    expect(component.profileForm.value.address_line1).toBe('');
  });

  it('selects a city suggestion', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    component.selectCitySuggestion({ postalCode: '24000', city: 'Périgueux' } as any);

    expect(component.profileForm.value.postal_code).toBe('24000');
    expect(component.profileForm.value.city).toBe('Périgueux');
    expect(component.citySuggestions).toEqual([]);
  });

  it('formats the display name, role label, membership status and document text keys', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    flushInitialLoad(httpMock);

    const component = fixture.componentInstance;
    expect(component.getDisplayName()).toBe('Jean Dupont');
    expect(component.getRoleLabel('admin')).toBe('profile.roles.admin');
    expect(component.getRoleLabel(undefined)).toBe('profile.roles.member');
    expect(component.getMembershipStatusLabel()).toBe('profile.membership.status.pending');
    expect(component.getDocumentTitle('member-guide')).toBe('profile.documents.items.member-guide.title');
    expect(component.getDocumentDescription('member-guide')).toBe(
      'profile.documents.items.member-guide.description'
    );
    expect(component.formatDate(undefined)).toBe('-');
    expect(component.formatDate('2027-01-01T10:00:00.000Z')).not.toBe('-');
  });

  it('falls back to the email when neither first nor last name is set', () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock
      .expectOne(`${environment.apiUrl}/profile/me`)
      .flush({ profile: { ...testUser, first_name: '', last_name: '' }, membership: { status: 'active' } });
    httpMock.expectOne(`${environment.apiUrl}/profile/documents`).flush({ documents: [] });

    const component = fixture.componentInstance;
    expect(component.getDisplayName()).toBe(testUser.email);
    expect(component.getMembershipStatusLabel()).toBe('profile.membership.status.active');
  });
});
