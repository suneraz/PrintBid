/**
 * This one's a "guard factory" - a function that RETURNS a guard,
 * configured for whichever role you ask for. That's why it's used
 * like roleGuard('customer') in the routes file, instead of being
 * used directly like authGuard is.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export function roleGuard(allowedRole: UserRole): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.currentUser()?.role === allowedRole) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
}
