// auth.guard.ts – use the function‑based API
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth  = inject(AuthService);
  const router = inject(Router);

  return auth.loggedInStatus ? true : router.createUrlTree(['/login']);
};
