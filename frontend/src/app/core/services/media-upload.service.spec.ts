import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { MediaUploadService } from './media-upload.service';

describe('MediaUploadService', () => {
  let service: MediaUploadService;
  let originalApiUrl: string;

  beforeEach(() => {
    originalApiUrl = environment.apiUrl;

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MediaUploadService);
  });

  afterEach(() => {
    environment.apiUrl = originalApiUrl;
  });

  it('returns an empty string when no media URL is provided', () => {
    expect(service.resolveMediaUrl(undefined)).toBe('');
  });

  it('keeps absolute URLs unchanged', () => {
    expect(service.resolveMediaUrl('https://cdn.example.org/photo.jpg')).toBe(
      'https://cdn.example.org/photo.jpg',
    );
  });

  it('rewrites API media URLs when the API is configured with an absolute host', () => {
    environment.apiUrl = 'https://api.ahedna.fr/api';

    expect(service.resolveMediaUrl('/api/uploads/images/sample.png')).toBe(
      'https://api.ahedna.fr/api/uploads/images/sample.png',
    );
  });

  it('rewrites root-relative media URLs when the API is configured with an absolute host', () => {
    environment.apiUrl = 'https://api.ahedna.fr/api';

    expect(service.resolveMediaUrl('/documents/member-guide.txt')).toBe(
      'https://api.ahedna.fr/documents/member-guide.txt',
    );
  });
});
