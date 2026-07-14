import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UploadImageResponse {
  url: string;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable({
  providedIn: 'root'
})
export class MediaUploadService {
  private http = inject(HttpClient);

  uploadImage(file: File): Observable<UploadImageResponse> {
    return from(this.readFileAsPayload(file)).pipe(
      switchMap((payload) =>
        this.http.post<UploadImageResponse>(`${environment.apiUrl}/uploads/images`, payload)
      )
    );
  }

  resolveMediaUrl(url?: string | null): string {
    if (!url) {
      return '';
    }

    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) {
      return url;
    }

    if (url.startsWith('/api/')) {
      if (environment.apiUrl.startsWith('http')) {
        return `${environment.apiUrl.replace(/\/api\/?$/, '')}${url}`;
      }

      return url;
    }

    if (url.startsWith('/') && environment.apiUrl.startsWith('http')) {
      return `${environment.apiUrl.replace(/\/api\/?$/, '')}${url}`;
    }

    return url;
  }

  private async readFileAsPayload(file: File): Promise<{ file_name: string; mime_type: string; data_base64: string }> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error('Formats acceptés : JPG, PNG, WebP ou GIF.');
    }

    if (file.size <= 0) {
      throw new Error('Le fichier sélectionné est vide.');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('L’image doit faire moins de 5 Mo.');
    }

    if (!(await this.hasValidImageSignature(file))) {
      throw new Error('Le contenu du fichier ne correspond pas au format annoncé.');
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'));
      reader.readAsDataURL(file);
    });

    const [, dataBase64 = ''] = dataUrl.split(',');

    if (!dataBase64) {
      throw new Error('Impossible de préparer cette image.');
    }

    return {
      file_name: file.name,
      mime_type: file.type,
      data_base64: dataBase64,
    };
  }

  private async hasValidImageSignature(file: File): Promise<boolean> {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

    if (file.type === 'image/jpeg') {
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }

    if (file.type === 'image/png') {
      const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      return signature.every((byte, index) => bytes[index] === byte);
    }

    if (file.type === 'image/webp') {
      return this.readAscii(bytes, 0, 4) === 'RIFF' && this.readAscii(bytes, 8, 12) === 'WEBP';
    }

    if (file.type === 'image/gif') {
      const header = this.readAscii(bytes, 0, 6);
      return header === 'GIF87a' || header === 'GIF89a';
    }

    return false;
  }

  private readAscii(bytes: Uint8Array, start: number, end: number): string {
    return Array.from(bytes.slice(start, end), (byte) => String.fromCharCode(byte)).join('');
  }
}
