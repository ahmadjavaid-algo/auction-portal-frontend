import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BidderAuthService } from '../services/bidderauth';

export const bidderauthGuard: CanActivateFn = (_route, state) => {
  const auth = inject(BidderAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    return true;
  }
  
  return router.createUrlTree(['/bidder/login'], {
    queryParams: { returnUrl: state.url }
  });
};
