import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccessoryService {

  constructor(private http: HttpClient) {}

  addAccessory(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.post("http://146.190.40.162:3000/accessory", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  updateAccessory(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.put("http://146.190.40.162:3000/accessory", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  listAccessory(headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.get("http://146.190.40.162:3000/accessory", { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  listStockAccessory(headers: HttpHeaders, data: any): Observable<any>{
    var response:any;
    return this.http.post("http://146.190.40.162:3000/contract/stock", data, { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  deleteAccessory(headers: HttpHeaders, data: any): Observable<any>{
    var response:any;
    return this.http.delete("http://146.190.40.162:3000/accessory/"+data, { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de eliminar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
}
