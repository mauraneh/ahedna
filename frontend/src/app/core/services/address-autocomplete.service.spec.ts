import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AddressAutocompleteService, AddressSuggestion } from './address-autocomplete.service';

const COMPLETION_URL = 'https://data.geopf.fr/geocodage/completion/';

describe('AddressAutocompleteService', () => {
  let service: AddressAutocompleteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AddressAutocompleteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns an empty array without any HTTP call for a query shorter than 3 characters', (done) => {
    service.search('ab').subscribe((suggestions) => {
      expect(suggestions).toEqual([]);
      done();
    });

    httpMock.expectNone(() => true);
  });

  it('queries the geoplatform API and normalizes valid results', (done) => {
    service.search('12 rue de la paix').subscribe((suggestions) => {
      expect(suggestions).toEqual([
        {
          label: '12 rue de la Paix 75002 Paris',
          city: 'Paris',
          postalCode: '75002',
          kind: 'housenumber',
          street: 'rue de la Paix',
        },
      ]);
      done();
    });

    const request = httpMock.expectOne(
      (req) => req.url === COMPLETION_URL && req.params.get('text') === '12 rue de la paix'
    );
    expect(request.request.params.get('type')).toBe('StreetAddress');
    expect(request.request.params.get('maximumResponses')).toBe('6');
    expect(request.request.params.has('zipcode')).toBe(false);

    request.flush({
      results: [
        {
          fulltext: '12 rue de la Paix 75002 Paris',
          city: 'Paris',
          zipcode: '75002',
          kind: 'housenumber',
          street: 'rue de la Paix',
        },
      ],
    });
  });

  it('discards incomplete results and de-duplicates identical suggestions', (done) => {
    service.search('rue de la paix').subscribe((suggestions) => {
      expect(suggestions.length).toBe(1);
      expect(suggestions[0].city).toBe('Paris');
      done();
    });

    const request = httpMock.expectOne(() => true);
    request.flush({
      results: [
        { fulltext: 'Adresse incomplète', city: '', zipcode: '75002', kind: 'housenumber' },
        { fulltext: '12 rue de la Paix', city: 'Paris', zipcode: '75002', kind: 'housenumber' },
        { fulltext: '12 rue de la Paix', city: 'Paris', zipcode: '75002', kind: 'housenumber' },
      ],
    });
  });

  it('adds the zipcode parameter only when it is a valid 5-digit postal code', (done) => {
    service.search('rue de la paix', '750x2').subscribe(() => done());

    const request = httpMock.expectOne(() => true);
    expect(request.request.params.has('zipcode')).toBe(false);
    request.flush({ results: [] });
  });

  it('returns an empty array when the HTTP request fails', (done) => {
    service.search('rue de la paix').subscribe((suggestions) => {
      expect(suggestions).toEqual([]);
      done();
    });

    const request = httpMock.expectOne(() => true);
    request.flush('error', { status: 500, statusText: 'Server Error' });
  });

  it('searchByPostalCode rejects anything that is not a 5-digit code', (done) => {
    service.searchByPostalCode('abc12').subscribe((suggestions) => {
      expect(suggestions).toEqual([]);
      done();
    });

    httpMock.expectNone(() => true);
  });

  it('searchByPostalCode forwards a valid postal code as both query and filter', (done) => {
    service.searchByPostalCode('75002').subscribe(() => done());

    const request = httpMock.expectOne(() => true);
    expect(request.request.params.get('text')).toBe('75002');
    expect(request.request.params.get('zipcode')).toBe('75002');
    request.flush({ results: [] });
  });

  it('formatLocation shows "postal code + city" for a municipality and the full label otherwise', () => {
    const municipality: AddressSuggestion = {
      label: 'Périgueux',
      city: 'Périgueux',
      postalCode: '24000',
      kind: 'municipality',
    };
    const street: AddressSuggestion = {
      label: '12 rue de la Paix 75002 Paris',
      city: 'Paris',
      postalCode: '75002',
      kind: 'housenumber',
    };

    expect(service.formatLocation(municipality)).toBe('24000 Périgueux');
    expect(service.formatLocation(street)).toBe('12 rue de la Paix 75002 Paris');
  });
});
