import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InspectorAuthService } from '../services/inspectorauth';

export const inspectorauthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(InspectorAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    return true;
  }
  
  return router.createUrlTree(['/inspector/login'], {
    queryParams: { returnUrl: state.url }
  });
};
