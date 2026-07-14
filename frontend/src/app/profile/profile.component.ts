import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import { NavbarComponent } from '../core/components/navbar/navbar.component';
import { ScrollToTopComponent } from '../core/components/scroll-to-top/scroll-to-top.component';
import { AddressAutocompleteService, AddressSuggestion } from '../core/services/address-autocomplete.service';
import { AuthService, User } from '../core/services/auth.service';
import { I18nService } from '../core/services/i18n.service';

interface Membership {
  id: string;
  status: 'pending' | 'active' | 'expired';
  start_date?: string | null;
  end_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at?: string;
}

interface MemberDocument {
  id: string;
  slug: string;
  file_url: string;
  minimum_role: 'membre' | 'auteur' | 'admin';
  sort_order: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslocoDirective, NavbarComponent, ScrollToTopComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private transloco = inject(TranslocoService);
  private addressAutocomplete = inject(AddressAutocompleteService);
  authService = inject(AuthService);
  i18nService = inject(I18nService);

  loading = true;
  savingProfile = false;
  savingPassword = false;
  deletingAccount = false;

  profile: User | null = null;
  membership: Membership | null = null;
  documents: MemberDocument[] = [];

  profileMessage = '';
  profileError = '';
  passwordMessage = '';
  passwordError = '';
  accountError = '';
  addressSuggestions: AddressSuggestion[] = [];
  citySuggestions: AddressSuggestion[] = [];
  private addressRequestId = 0;
  private cityRequestId = 0;

  profileForm = this.fb.group({
    first_name: [''],
    last_name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    address_line1: [''],
    address_line2: [''],
    postal_code: [''],
    city: [''],
    country: [''],
    bio: [''],
    avatar_url: [''],
  });

  passwordForm = this.fb.group({
    current_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  deleteAccountForm = this.fb.group({
    confirm_email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData(): void {
    this.loading = true;
    this.profileError = '';

    forkJoin({
      profileResponse: this.http.get<{ profile: User; membership: Membership | null }>(`${environment.apiUrl}/profile/me`),
      documentsResponse: this.http.get<{ documents: MemberDocument[] }>(`${environment.apiUrl}/profile/documents`),
    }).subscribe({
      next: ({ profileResponse, documentsResponse }) => {
        this.profile = profileResponse.profile;
        this.membership = profileResponse.membership;
        this.documents = documentsResponse.documents;
        this.profileForm.patchValue({
          first_name: profileResponse.profile.first_name || '',
          last_name: profileResponse.profile.last_name || '',
          email: profileResponse.profile.email || '',
          phone: profileResponse.profile.phone || '',
          address_line1: profileResponse.profile.address_line1 || '',
          address_line2: profileResponse.profile.address_line2 || '',
          postal_code: profileResponse.profile.postal_code || '',
          city: profileResponse.profile.city || '',
          country: profileResponse.profile.country || '',
          bio: profileResponse.profile.bio || '',
          avatar_url: profileResponse.profile.avatar_url || '',
        });
        this.loading = false;
      },
      error: (error) => {
        this.profileError = error.error?.error || this.transloco.translate('profile.messages.loadError');
        this.loading = false;
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile = true;
    this.profileMessage = '';
    this.profileError = '';

    this.http.put<{ message: string; profile: User; membership: Membership | null; token: string }>(
      `${environment.apiUrl}/profile/me`,
      this.profileForm.getRawValue()
    ).subscribe({
      next: (response) => {
        this.profile = response.profile;
        this.membership = response.membership;
        this.authService.updateSession(response.profile, response.token);
        this.profileMessage = response.message;
        this.savingProfile = false;
      },
      error: (error) => {
        this.profileError = error.error?.error || this.transloco.translate('profile.messages.updateProfileError');
        this.savingProfile = false;
      }
    });
  }

  onAddressInput(): void {
    const address = (this.profileForm.value.address_line1 || '').trim();

    if (address.length < 3) {
      this.addressSuggestions = [];
      return;
    }

    const requestId = ++this.addressRequestId;
    const postalCode = this.profileForm.value.postal_code || undefined;

    this.addressAutocomplete.search(address, postalCode).subscribe((suggestions) => {
      if (requestId === this.addressRequestId) {
        this.addressSuggestions = suggestions;
      }
    });
  }

  onPostalCodeInput(): void {
    const postalCode = (this.profileForm.value.postal_code || '').trim();

    if (!/^\d{5}$/.test(postalCode)) {
      this.citySuggestions = [];
      return;
    }

    const requestId = ++this.cityRequestId;

    this.addressAutocomplete.searchByPostalCode(postalCode).subscribe((suggestions) => {
      if (requestId !== this.cityRequestId) {
        return;
      }

      this.citySuggestions = suggestions;

      if (suggestions[0]) {
        this.profileForm.patchValue({
          city: suggestions[0].city,
          country: this.profileForm.value.country || 'France',
        });
      }
    });
  }

  onCityInput(): void {
    const city = (this.profileForm.value.city || '').trim();

    if (city.length < 3) {
      this.citySuggestions = [];
      return;
    }

    const requestId = ++this.cityRequestId;

    this.addressAutocomplete.search(city).subscribe((suggestions) => {
      if (requestId === this.cityRequestId) {
        this.citySuggestions = suggestions.filter((suggestion) => suggestion.kind === 'municipality');
      }
    });
  }

  selectAddressSuggestion(suggestion: AddressSuggestion): void {
    this.profileForm.patchValue({
      address_line1: suggestion.kind === 'municipality' ? '' : suggestion.label.split(',')[0]?.trim() || suggestion.label,
      postal_code: suggestion.postalCode,
      city: suggestion.city,
      country: this.profileForm.value.country || 'France',
    });
    this.addressSuggestions = [];
    this.citySuggestions = [];
  }

  selectCitySuggestion(suggestion: AddressSuggestion): void {
    this.profileForm.patchValue({
      postal_code: suggestion.postalCode,
      city: suggestion.city,
      country: this.profileForm.value.country || 'France',
    });
    this.citySuggestions = [];
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword = true;
    this.passwordMessage = '';
    this.passwordError = '';

    this.http.put<{ message: string }>(`${environment.apiUrl}/profile/password`, this.passwordForm.getRawValue())
      .subscribe({
        next: (response) => {
          this.passwordMessage = response.message;
          this.passwordForm.reset();
          this.savingPassword = false;
        },
        error: (error) => {
          this.passwordError = error.error?.error || this.transloco.translate('profile.messages.updatePasswordError');
          this.savingPassword = false;
        }
      });
  }

  deleteAccount(): void {
    if (this.deleteAccountForm.invalid || !this.canDeleteAccount()) {
      this.deleteAccountForm.markAllAsTouched();
      this.accountError = this.transloco.translate('profile.messages.deleteAccountConfirmEmail');
      return;
    }

    this.deletingAccount = true;
    this.accountError = '';

    this.http.request<{ message: string }>('delete', `${environment.apiUrl}/profile/me`, {
      body: this.deleteAccountForm.getRawValue()
    }).subscribe({
      next: () => {
        this.authService.logout();
      },
      error: (error) => {
        this.accountError = error.error?.error || this.transloco.translate('profile.messages.deleteAccountError');
        this.deletingAccount = false;
      }
    });
  }

  getDisplayName(): string {
    if (!this.profile) {
      return '';
    }

    const fullName = [this.profile.first_name, this.profile.last_name].filter(Boolean).join(' ');
    return fullName || this.profile.email;
  }

  getRoleLabel(role: User['role'] | undefined): string {
    const roleMap: Record<string, string> = {
      membre: 'profile.roles.member',
      auteur: 'profile.roles.author',
      admin: 'profile.roles.admin',
    };

    return role ? roleMap[role] : 'profile.roles.member';
  }

  getMembershipStatusLabel(): string {
    const status = this.membership?.status || 'pending';
    const statusMap: Record<string, string> = {
      pending: 'profile.membership.status.pending',
      active: 'profile.membership.status.active',
      expired: 'profile.membership.status.expired',
    };

    return statusMap[status] || statusMap.pending;
  }

  getDocumentTitle(slug: string): string {
    return `profile.documents.items.${slug}.title`;
  }

  getDocumentDescription(slug: string): string {
    return `profile.documents.items.${slug}.description`;
  }

  canDeleteAccount(): boolean {
    const confirmEmail = this.deleteAccountForm.get('confirm_email')?.value?.trim().toLowerCase();
    const currentEmail = this.profile?.email?.trim().toLowerCase();
    return !!confirmEmail && !!currentEmail && confirmEmail === currentEmail;
  }

  formatDate(date?: string | null): string {
    return date ? new Date(date).toLocaleDateString(this.i18nService.getDateLocale()) : '-';
  }
}
