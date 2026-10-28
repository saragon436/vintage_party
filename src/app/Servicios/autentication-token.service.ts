import { Injectable } from '@angular/core';

@Injectable()
export class AuthenticationToken {
  myValue: any;
  user:any;
  // Rol del usuario autenticado (ej. 'SUPER_ADMIN'). Se guarda aparte de `user`
  // porque `user` ya se usa en otras pantallas como el nombre a mostrar (string).
  rol: string | undefined;

  isSuperAdmin(): boolean {
    return this.rol === 'SUPER_ADMIN';
  }
}