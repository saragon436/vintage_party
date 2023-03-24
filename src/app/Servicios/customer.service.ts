import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  constructor(private http: HttpClient) {}

  addCustomer(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.post("http://146.190.40.162:3000/customer", body, { headers, observe: response }).pipe(
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
    return this.http.get("http://146.190.40.162:3000/customer", { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  updateCustomer(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.put("http://146.190.40.162:3000/customer", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
}
