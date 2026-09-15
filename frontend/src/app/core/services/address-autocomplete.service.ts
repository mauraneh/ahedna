import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

export interface AddressSuggestion {
  label: string;
  city: string;
  postalCode: string;
  kind: string;
  street?: string;
}

interface GeoplatformCompletionResult {
  fulltext?: string;
  city?: string;
  zipcode?: string;
  kind?: string;
  street?: string;
}

interface GeoplatformCompletionResponse {
  results?: GeoplatformCompletionResult[];
}

interface GeoplatformMunicipalityProperties {
  label?: string;
  name?: string;
  city?: string;
  municipality?: string;
  postcode?: string;
  type?: string;
}

interface GeoplatformMunicipalityResponse {
  features?: Array<{
    properties?: GeoplatformMunicipalityProperties;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class AddressAutocompleteService {
  private http = inject(HttpClient);
  private readonly completionUrl = 'https://data.geopf.fr/geocodage/completion/';
  private readonly municipalitySearchUrl = 'https://data.geopf.fr/geocodage/search/';

  search(text: string, postalCode?: string): Observable<AddressSuggestion[]> {
    const query = text.trim();

    if (query.length < 3) {
      return of([]);
    }

    let params = new HttpParams()
      .set('text', query)
      .set('type', 'StreetAddress')
      .set('maximumResponses', '6');

    if (postalCode && /^\d{5}$/.test(postalCode)) {
      params = params.set('zipcode', postalCode);
    }

    return this.http.get<GeoplatformCompletionResponse>(this.completionUrl, { params }).pipe(
      map((response) => this.normalizeSuggestions(response.results || [])),
      catchError(() => of([])),
    );
  }

  searchByPostalCode(postalCode: string): Observable<AddressSuggestion[]> {
    const normalizedPostalCode = postalCode.trim();

    if (!/^\d{5}$/.test(normalizedPostalCode)) {
      return of([]);
    }

    return this.search(normalizedPostalCode, normalizedPostalCode);
  }

  searchCities(text: string): Observable<AddressSuggestion[]> {
    const query = text.trim();

    if (query.length < 3) {
      return of([]);
    }

    const params = new HttpParams()
      .set('q', query)
      .set('type', 'municipality')
      .set('limit', '10');

    return this.http.get<GeoplatformMunicipalityResponse>(this.municipalitySearchUrl, { params }).pipe(
      map((response) => this.normalizeMunicipalitySuggestions(response.features || [])),
      catchError(() => of([])),
    );
  }

  formatLocation(suggestion: AddressSuggestion): string {
    if (suggestion.kind === 'municipality') {
      return `${suggestion.postalCode} ${suggestion.city}`.trim();
    }

    return suggestion.label;
  }

  formatCity(suggestion: AddressSuggestion): string {
    return `${suggestion.city} (${suggestion.postalCode})`;
  }

  private normalizeSuggestions(results: GeoplatformCompletionResult[]): AddressSuggestion[] {
    const seen = new Set<string>();

    return results.reduce<AddressSuggestion[]>((suggestions, result) => {
      const label = (result.fulltext || '').trim();
      const city = (result.city || '').trim();
      const postalCode = (result.zipcode || '').trim();

      if (!label || !city || !postalCode) {
        return suggestions;
      }

      const key = `${label}-${postalCode}`.toLowerCase();

      if (seen.has(key)) {
        return suggestions;
      }

      seen.add(key);
      suggestions.push({
        label,
        city,
        postalCode,
        kind: result.kind || 'address',
        street: result.street,
      });

      return suggestions;
    }, []);
  }

  private normalizeMunicipalitySuggestions(
    features: NonNullable<GeoplatformMunicipalityResponse['features']>
  ): AddressSuggestion[] {
    const seen = new Set<string>();

    return features.reduce<AddressSuggestion[]>((suggestions, feature) => {
      const properties = feature.properties;
      const city = (properties?.city || properties?.municipality || properties?.name || '').trim();
      const postalCode = (properties?.postcode || '').trim();

      if (!city || !postalCode || properties?.type !== 'municipality') {
        return suggestions;
      }

      const key = `${city}-${postalCode}`.toLocaleLowerCase('fr');

      if (seen.has(key)) {
        return suggestions;
      }

      seen.add(key);
      suggestions.push({
        label: (properties?.label || city).trim(),
        city,
        postalCode,
        kind: 'municipality',
      });

      return suggestions;
    }, []);
  }
}
