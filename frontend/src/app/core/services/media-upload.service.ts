import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UploadImageResponse {
  url: string;
}

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
    if (!file.type.startsWith('image/')) {
      throw new Error('Le fichier sélectionné n’est pas une image.');
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
}
