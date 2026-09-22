import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders,HttpParams } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AccessoryService {

  constructor(private http: HttpClient) {}

  addAccessory(body:any,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.post(environment.apiUrl+"/accessory", body, { headers, observe: response }).pipe(
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
    return this.http.put(environment.apiUrl+"/accessory", body, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  listAccessory(headers: HttpHeaders, search?: string): Observable<any>{
    var response:any;
    let params = new HttpParams();
    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    return this.http.get(environment.apiUrl+"/accessory", { headers, params, observe: response }).pipe(
      catchError( e => {
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  listStockAccessory(headers: HttpHeaders, data: any): Observable<any>{
    var response:any;
    return this.http.post(environment.apiUrl+"/contract/stock", data, { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  uploadAccessoryImage(id: string, file: File, headers: HttpHeaders): Observable<any>{
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post(environment.apiUrl + "/accessory/" + id + "/image", formData, { headers }).pipe(
      catchError( e => {
        console.error('Error al subir imagen', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  deleteAccessory(headers: HttpHeaders, data: any): Observable<any>{
    var response:any;
    return this.http.delete(environment.apiUrl+"/accessory/"+data, { headers, observe: response }).pipe(
      catchError( e => {     
        console.error('Error de eliminar', e)
        throw (e)
      }),
      map( x => x),
    )
  }
}
