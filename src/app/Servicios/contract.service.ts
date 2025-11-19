import { Injectable } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable,of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WeekSummaryDto } from '../kardex/models/weekly-summary.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  constructor(private http: HttpClient) {}

  saveContract(body:any, headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.post(environment.apiUrl+"/contract", body, { headers, observe: response }).pipe(
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
    return this.http.put(environment.apiUrl+"/contract/", body, { headers, observe: response }).pipe(
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
    return this.http.get(environment.apiUrl+"/contract", { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  getContractsByYear(year: number, headers: HttpHeaders): Observable<any[]> {
  return this.http.get<any[]>(`${environment.apiUrl}/contract/year/${year}`, { headers });
}

  listContractById(id:string,headers: HttpHeaders): Observable<any>{
    var response:any;
    return this.http.get(environment.apiUrl+"/contract/"+id, { headers, observe: response }).pipe(
      catchError( e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map( x => x),
    )
  }

  getWeeklySummary(
    year: number,
    month: number,
    headers: HttpHeaders
  ): Observable<WeekSummaryDto[]> {
    return this.http.get<WeekSummaryDto[]>(
      `${environment.apiUrl}/contract/summary/weekly?year=${year}&month=${month}`,
      { headers }
    );
  }

   // 🔥 NUEVO: consumir /contracts/year/:year/status/:status
  getContractsByYearAndStatus(
    year: number,
    status: string,
    headers: HttpHeaders
  ): Observable<any[]> {
    const url = `${environment.apiUrl}/contract/year/${year}/status/${encodeURIComponent(status)}`;
    return this.http.get<any[]>(url, { headers });
  }
}
