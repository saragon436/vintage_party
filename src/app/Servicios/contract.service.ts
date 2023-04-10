import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  constructor(private http: HttpClient) {}

  saveContract(body:any, headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.post("http://146.190.40.162:3000/contract", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
  updateContract(body:any, headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.put("http://146.190.40.162:3000/contract", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de actualizar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  listContract(headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.get("http://146.190.40.162:3000/contract", { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
}
