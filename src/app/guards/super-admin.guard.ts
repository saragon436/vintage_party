import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';

@Injectable({ providedIn: 'root' })
export class SuperAdminGuard implements CanActivate {

  constructor(
    private authenticationToken: AuthenticationToken,
    private router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.authenticationToken.isSuperAdmin()) {
      return true;
    }
    return this.router.parseUrl('/dashboard');
  }
}
