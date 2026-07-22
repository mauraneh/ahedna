import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { MediaUploadService } from './media-upload.service';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngFile(name = 'photo.png', extraBytes: number[] = [1, 2, 3, 4]): File {
  return new File([new Uint8Array([...PNG_SIGNATURE, ...extraBytes])], name, {
    type: 'image/png',
  });
}

function signedFile(name: string, mimeType: string, signature: number[]): File {
  return new File([new Uint8Array([...signature, 0, 0, 0, 0])], name, { type: mimeType });
}

function waitForUpload(
  httpMock: HttpTestingController,
  apiUrl: string,
  respond: (request: import('@angular/common/http/testing').TestRequest) => void
): void {
  const poll = () => {
    const pending = httpMock.match(`${apiUrl}/uploads/images`);
    if (pending.length === 0) {
      setTimeout(poll, 0);
      return;
    }
    respond(pending[0]);
  };
  poll();
}

describe('MediaUploadService', () => {
  let service: MediaUploadService;
  let httpMock: HttpTestingController;
  let originalApiUrl: string;

  beforeEach(() => {
    originalApiUrl = environment.apiUrl;

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(MediaUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.apiUrl = originalApiUrl;
    httpMock.verify();
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

  it('rejects a file whose type is not an accepted image format', (done) => {
    const file = new File([new Uint8Array([1, 2, 3])], 'document.pdf', {
      type: 'application/pdf',
    });

    service.uploadImage(file).subscribe({
      error: (error) => {
        expect(error.message).toContain('JPG, PNG, WebP ou GIF');
        done();
      },
    });
  });

  it('rejects an empty file', (done) => {
    const file = new File([], 'empty.png', { type: 'image/png' });

    service.uploadImage(file).subscribe({
      error: (error) => {
        expect(error.message).toContain('vide');
        done();
      },
    });
  });

  it('rejects a file larger than 5 Mo', (done) => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    oversized.set(PNG_SIGNATURE, 0);
    const file = new File([oversized], 'big.png', { type: 'image/png' });

    service.uploadImage(file).subscribe({
      error: (error) => {
        expect(error.message).toContain('5 Mo');
        done();
      },
    });
  });

  it('rejects a file whose content does not match its declared MIME type', (done) => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'fake.png', {
      type: 'image/png',
    });

    service.uploadImage(file).subscribe({
      error: (error) => {
        expect(error.message).toContain('ne correspond pas au format annoncé');
        done();
      },
    });
  });

  it('uploads a valid PNG file as a base64 payload and returns the server URL', (done) => {
    service.uploadImage(pngFile()).subscribe((response) => {
      expect(response.url).toBe('/api/uploads/images/photo.png');
      done();
    });

    // FileReader performs genuine async I/O (not a fake-timer-controlled task), so we poll
    // briefly until the resulting HTTP request has actually reached the testing backend.
    waitForUpload(httpMock, environment.apiUrl, (request) => {
      expect(request.request.body.file_name).toBe('photo.png');
      expect(request.request.body.mime_type).toBe('image/png');
      expect(typeof request.request.body.data_base64).toBe('string');
      request.flush({ url: '/api/uploads/images/photo.png' });
    });
  });

  it('accepts a valid JPEG signature', (done) => {
    const file = signedFile('photo.jpg', 'image/jpeg', [0xff, 0xd8, 0xff]);

    service.uploadImage(file).subscribe((response) => {
      expect(response.url).toBe('/api/uploads/images/ok');
      done();
    });

    waitForUpload(httpMock, environment.apiUrl, (request) => {
      request.flush({ url: '/api/uploads/images/ok' });
    });
  });

  it('accepts a valid WebP signature', (done) => {
    const asciiCodes = (text: string) => text.split('').map((c) => c.charCodeAt(0));
    const file = signedFile('photo.webp', 'image/webp', [
      ...asciiCodes('RIFF'),
      0,
      0,
      0,
      0,
      ...asciiCodes('WEBP'),
    ]);

    service.uploadImage(file).subscribe((response) => {
      expect(response.url).toBe('/api/uploads/images/ok');
      done();
    });

    waitForUpload(httpMock, environment.apiUrl, (request) => {
      request.flush({ url: '/api/uploads/images/ok' });
    });
  });

  it('accepts a valid GIF signature', (done) => {
    const file = signedFile(
      'photo.gif',
      'image/gif',
      'GIF89a'.split('').map((c) => c.charCodeAt(0))
    );

    service.uploadImage(file).subscribe((response) => {
      expect(response.url).toBe('/api/uploads/images/ok');
      done();
    });

    waitForUpload(httpMock, environment.apiUrl, (request) => {
      request.flush({ url: '/api/uploads/images/ok' });
    });
  });

  it('rejects a JPEG file whose bytes do not match the declared signature', (done) => {
    const file = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'fake.jpg', {
      type: 'image/jpeg',
    });

    service.uploadImage(file).subscribe({
      error: (error) => {
        expect(error.message).toContain('ne correspond pas au format annoncé');
        done();
      },
    });
  });
});
