import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  constructor(private http: HttpClient) {}

  addCustomer(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.post(environment.apiUrl+"/customer", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  listCustomer(headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.get(environment.apiUrl+"/customer", { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  updateCustomer(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.put(environment.apiUrl+"/customer", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
  deleteCustomer(body:string,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.delete(environment.apiUrl+"/customer/"+body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de eliminar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
}
