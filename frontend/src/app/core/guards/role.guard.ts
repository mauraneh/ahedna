import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService, EffectiveRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRoles = route.data['roles'] as EffectiveRole[];
  await authService.ensureLoaded();

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: state.url }
    });
  }

  if (authService.hasRole(requiredRoles)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
