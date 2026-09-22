import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { WeekSummaryDto } from '../kardex/models/weekly-summary.model';
import { HttpParams } from '@angular/common/http';

export interface DistrictSummary {
  district: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {

  constructor(private http: HttpClient) { }

  saveContract(body: any, headers: HttpHeaders): Observable<any> {
    var response: any;
    return this.http.post(environment.apiUrl + "/contract", body, { headers, observe: response }).pipe(
      catchError(e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  savecontractbyquotation(body: any, headers: HttpHeaders): Observable<any> {
    var response: any;
    return this.http.post(environment.apiUrl + "/contract/from-quotation", body, { headers, observe: response }).pipe(
      catchError(e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  updateContract(body: any, headers: HttpHeaders): Observable<any> {
    var response: any;
    return this.http.put(environment.apiUrl + "/contract/", body, { headers, observe: response }).pipe(
      catchError(e => {
        //implementar aca la logica del error        
        console.error('Error de actualizar', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  listContract(headers: HttpHeaders): Observable<any> {
    var response: any;
    return this.http.get(environment.apiUrl + "/contract", { headers, observe: response }).pipe(
      catchError(e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  getContractsByYear(year: number, headers: HttpHeaders): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/contract/year/${year}`, { headers });
  }

  getPendingBalanceByCustomer(customerId: string, headers: HttpHeaders): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/contract/customer/${customerId}/pending`, { headers });
  }

  getContractsByCustomer(customerId: string, headers: HttpHeaders): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/contract/customer/${customerId}`, { headers });
  }

  getCustomerIdsWithPendingBalance(headers: HttpHeaders): Observable<{ customerIds: string[] }> {
    return this.http.get<{ customerIds: string[] }>(`${environment.apiUrl}/contract/pending-customers`, { headers });
  }

  listContractById(id: string, headers: HttpHeaders): Observable<any> {
    var response: any;
    return this.http.get(environment.apiUrl + "/contract/" + id, { headers, observe: response }).pipe(
      catchError(e => {
        //implementar aca la logica del error        
        console.error('Error de agregar', e)
        throw (e)
      }),
      map(x => x),
    )
  }

  getAccessoryReservations(accessoryId: string, headers: HttpHeaders): Observable<any[]> {
    return this.http.get<any[]>(environment.apiUrl + "/contract/accessory/" + accessoryId + "/reservations", { headers }).pipe(
      catchError(e => {
        console.error('Error al obtener reservas del mobiliario', e)
        throw (e)
      }),
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

  getContractsFiltered(
    year: number | null,
    status: string | null,
    search: string | null,
    onlyRecent: boolean,
    headers: HttpHeaders
  ) {
    let params = new HttpParams();

    if (year) params = params.set('year', year.toString());
    if (status) params = params.set('status', status);
    if (search && search.trim() !== '') params = params.set('search', search.trim());
    if (onlyRecent) params = params.set('onlyRecent', 'true');

    return this.http.get<any[]>(`${environment.apiUrl}/contract/search`, {
      headers,
      params,
    });
  }
  getRecentContracts(headers: HttpHeaders) {
    return this.http.get<any[]>(environment.apiUrl + '/contract/search?onlyRecent=true', { headers });
  }

  searchContracts(term: string, headers: HttpHeaders) {
    return this.http.get<any[]>(
      environment.apiUrl + '/contract/search',
      {
        headers,
        params: { q: term }
      }
    );
  }

  getContractById(id: string, headers: HttpHeaders) {
    return this.http.get<any>(`${environment.apiUrl}/contract/${id}`, { headers });
  }

  // 🔥 NUEVO: mapa de calor de alquileres por distrito (módulo de almacén y entrega)
  getDistrictSummary(headers: HttpHeaders, fromDate?: string, toDate?: string): Observable<DistrictSummary[]> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);

    return this.http.get<DistrictSummary[]>(`${environment.apiUrl}/contract/summary/by-district`, { headers, params });
  }

  getContractsByDistrict(district: string, headers: HttpHeaders, fromDate?: string, toDate?: string): Observable<any[]> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);

    return this.http.get<any[]>(`${environment.apiUrl}/contract/by-district/${encodeURIComponent(district)}`, { headers, params });
  }

}
