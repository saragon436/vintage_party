import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { Observable,of } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(private http: HttpClient) {}
  
  sendPostRequest(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;

    this.http.post("http://localhost:3000/auth",body,{ headers }).subscribe(
      data=>{
        response= data;
      },
      error=>{
        response= error;
      })
      return of(response);
  }

}
