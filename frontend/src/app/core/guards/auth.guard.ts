/**
 * A Guard is a function Angular's router runs BEFORE it navigates to
 * a route. If it returns true, navigation proceeds; if false, it's
 * blocked (here, redirected to /login instead). This is the frontend
 * equivalent of Flask's @jwt_required() - except Flask blocks an API
 * call, this blocks a PAGE from opening in the first place.
 *
 * Important: this alone does NOT make data secure - a determined
 * person could still bypass it in their browser. The real protection
 * is the backend's own checks (role_required, ownership checks on
 * every route) that we already built and tested. This guard exists
 * purely for a better user experience: hiding pages that would fail
 * anyway, and redirecting them somewhere useful instead of showing a
 * confusing error.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
