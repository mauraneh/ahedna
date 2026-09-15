import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenStorage } from '../services/auth-token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthTokenStorage).get();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
