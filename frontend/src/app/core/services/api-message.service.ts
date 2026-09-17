import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

// The API answers in English with stable sentences. They are mapped here rather than
// shown as-is, and anything unmapped falls back to the caller's own message.
const SERVER_MESSAGE_KEYS: Record<string, string> = {
  'Active membership required to upload photos': 'api.errors.membershipRequiredUpload',
  'Active membership required to view the gallery': 'api.errors.membershipRequiredGallery',
  'Authentication required': 'api.errors.authenticationRequired',
  'Content required': 'api.errors.contentRequired',
  'Current password and new password are required': 'api.errors.passwordsRequired',
  'Current password is incorrect': 'api.errors.currentPasswordIncorrect',
  'Email already registered': 'api.errors.emailAlreadyRegistered',
  'Email and password required': 'api.errors.emailPasswordRequired',
  'Email confirmation does not match your account': 'api.errors.emailConfirmationMismatch',
  'Email is required': 'api.errors.emailRequired',
  'Event not found': 'api.errors.eventNotFound',
  'Gallery is not open for this event': 'api.errors.galleryClosed',
  'Insufficient permissions': 'api.errors.insufficientPermissions',
  'Internal server error': 'api.errors.internal',
  'Invalid credentials': 'api.errors.invalidCredentials',
  'Invalid or expired token': 'api.errors.sessionExpired',
  'Invalid participation status': 'api.errors.invalidParticipation',
  'Invalid role': 'api.errors.invalidRole',
  'Membership number already assigned': 'api.errors.membershipNumberTaken',
  'News not found': 'api.errors.newsNotFound',
  'News not found or not editable': 'api.errors.newsNotEditable',
  'News not found or not removable': 'api.errors.newsNotRemovable',
  'Password must be at least 8 characters long': 'api.errors.passwordTooShort',
  'Photo URL required': 'api.errors.photoUrlRequired',
  'Photo not found': 'api.errors.photoNotFound',
  'Title and content required': 'api.errors.titleContentRequired',
  'Title and event date required': 'api.errors.titleDateRequired',
  'Topic not found': 'api.errors.topicNotFound',
  'Use your profile page to delete your own account': 'api.errors.deleteOwnAccount',
  'User not found': 'api.errors.userNotFound',
};

@Injectable({ providedIn: 'root' })
export class ApiMessageService {
  private transloco = inject(TranslocoService);

  translateError(error: unknown, fallbackKey: string, params?: Record<string, unknown>): string {
    const serverMessage = this.extractServerMessage(error);
    const key = serverMessage ? SERVER_MESSAGE_KEYS[serverMessage] : undefined;

    if (key) {
      return this.transloco.translate(key);
    }

    // A client-side validation error (file format, size) already carries French text.
    const clientMessage = (error as { message?: string } | null)?.message;
    if (clientMessage && !serverMessage) {
      return clientMessage;
    }

    return this.transloco.translate(fallbackKey, params);
  }

  private extractServerMessage(error: unknown): string | null {
    const body = (error as { error?: { error?: unknown } } | null)?.error;
    const message = body?.error;
    return typeof message === 'string' && message ? message : null;
  }
}
