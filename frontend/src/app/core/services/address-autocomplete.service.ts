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

@Injectable({
  providedIn: 'root',
})
export class AddressAutocompleteService {
  private http = inject(HttpClient);
  private readonly completionUrl = 'https://data.geopf.fr/geocodage/completion/';

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

  formatLocation(suggestion: AddressSuggestion): string {
    if (suggestion.kind === 'municipality') {
      return `${suggestion.postalCode} ${suggestion.city}`.trim();
    }

    return suggestion.label;
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
}
