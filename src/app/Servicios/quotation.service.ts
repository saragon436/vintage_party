import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class QuotationService {

    constructor(private http: HttpClient) { }

    saveQuotation(body: any, headers: HttpHeaders): Observable<any> {
        // Uses the curl provided: POST /quotation
        return this.http.post(environment.apiUrl + "/quotation", body, { headers }).pipe(
            catchError(e => {
                console.error('Error saving quotation', e);
                throw e;
            }),
            map(x => x)
        );
    }

    // If update is needed, assuming PUT /quotation/:id or similar, but user only showed POST /contract for conversion
    // and GET /quotation/:id. 
    // However, usually there is an update endpoint. I'll stick to what I can infer or pattern match from ContractService.
    // ContractService has updateContract. I'll add updateQuotation assuming similar pattern if needed, but for now
    // user request emphasized creating and listing.

    listQuotation(headers: HttpHeaders, page: number = 1, limit: number = 20, search?: string): Observable<any> {
        // curl --location 'http://localhost:3000/quotation?page=1&limit=20&search=texto'
        let params = new HttpParams().set('page', page).set('limit', limit);
        if (search && search.trim() !== '') {
            params = params.set('search', search.trim());
        }
        return this.http.get(environment.apiUrl + "/quotation", { headers, params }).pipe(
            catchError(e => {
                console.error('Error listing quotations', e);
                throw e;
            }),
            map(x => x)
        );
    }

    getQuotationsByCustomer(customerId: string, headers: HttpHeaders): Observable<any[]> {
        return this.http.get<any[]>(environment.apiUrl + "/quotation/customer/" + customerId, { headers }).pipe(
            catchError(e => {
                console.error('Error getting quotations by customer', e);
                throw e;
            }),
            map(x => x)
        );
    }

    getQuotationById(id: string, headers: HttpHeaders): Observable<any> {
        // curl --location 'http://localhost:3000/quotation/{{QUOTATION_ID}}'
        return this.http.get(environment.apiUrl + "/quotation/" + id, { headers }).pipe(
            catchError(e => {
                console.error('Error getting quotation by id', e);
                throw e;
            }),
            map(x => x)
        );
    }

    updateQuotation(body: any, headers: HttpHeaders): Observable<any> {
        // Correcting per user instruction: PUT /quotation/:id
        const id = body._id || body.id;
        return this.http.put(environment.apiUrl + "/quotation/" + id, body, { headers }).pipe(
            catchError(e => {
                console.error('Error updating quotation', e);
                throw e;
            }),
            map(x => x)
        );
    }

    // To convert to contract, the user sends POST /contract with quotationId.
    // This is technically a contract service operation, but we might trigger it from here or just use contract service.
    // "passarlas a contrato" -> The user provided:
    // curl --location 'http://localhost:3000/contract' ... --data '{ "quotationId": ... }'
    // So this will be done using ContractService.saveContract typically, just sending the quotationId in the body.

    // Genera el PDF al vuelo a partir de una imagen (data URL base64) capturada
    // en el navegador. El backend no guarda nada, solo arma el PDF y lo devuelve.
    generatePdf(imageDataUrl: string, headers: HttpHeaders): Observable<Blob> {
        return this.http.post(environment.apiUrl + "/quotation/pdf", { image: imageDataUrl }, {
            headers,
            responseType: 'blob'
        }).pipe(
            catchError(e => {
                console.error('Error generando PDF', e);
                throw e;
            })
        );
    }
}
