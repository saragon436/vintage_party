import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) {}

  listUsers(headers: HttpHeaders): Observable<any> {
    return this.http.get(environment.apiUrl + "/users", { headers }).pipe(
      catchError(e => {
        console.error('Error al listar usuarios', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  // La creación sigue viviendo en /auth/register (ya restringido a Super Admin en el backend).
  createUser(body: any, headers: HttpHeaders): Observable<any> {
    return this.http.post(environment.apiUrl + "/auth/register", body, { headers }).pipe(
      catchError(e => {
        console.error('Error al crear usuario', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  updateUser(id: string, body: any, headers: HttpHeaders): Observable<any> {
    return this.http.put(environment.apiUrl + "/users/" + id, body, { headers }).pipe(
      catchError(e => {
        console.error('Error al actualizar usuario', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  deleteUser(id: string, headers: HttpHeaders): Observable<any> {
    return this.http.delete(environment.apiUrl + "/users/" + id, { headers }).pipe(
      catchError(e => {
        console.error('Error al eliminar usuario', e)
        throw (e)
      }),
      map(x => x),
    )
  }
}
