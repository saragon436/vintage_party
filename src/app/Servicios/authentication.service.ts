import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(private http: HttpClient) {}
  
  sendPostRequest(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;

    // this.http.post("http://localhost:3000/auth",body,{ headers }).subscribe(
    //   data=>{
    //     response= data;
        
    //   },
    //   error=>{
    //     response= error;
        
    //   })
    //   return of(response);
    return this.http.post("http://146.190.40.162:3000/auth", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de logueo', e)
        throw (e)
      }),
      map( x => x),
    )
  }

}
