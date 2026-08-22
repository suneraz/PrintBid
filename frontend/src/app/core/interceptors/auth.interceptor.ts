/**
 * An Interceptor sits between every HTTP request your app makes and
 * the network - it gets a chance to modify the request before it
 * goes out. This one's job: attach "Authorization: Bearer <token>"
 * to every request automatically, so individual components never
 * need to remember to add it themselves (the same way @jwt_required()
 * checks for that header on the Flask side, but here we're the one
 * SENDING it).
 */

import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'printbid_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
