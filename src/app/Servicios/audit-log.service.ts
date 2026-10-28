import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface AuditLogFilter {
  userName?: string;
  module?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {

  constructor(private http: HttpClient) {}

  listLogs(headers: HttpHeaders, filter: AuditLogFilter = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get(environment.apiUrl + "/audit-logs", { headers, params }).pipe(
      catchError(e => {
        console.error('Error al listar auditoría', e)
        throw (e)
      }),
      map(x => x),
    )
  }
}
