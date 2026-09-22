import { TestBed } from '@angular/core/testing';
import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';

import { QuotationService } from './quotation.service';
import { environment } from 'src/environments/environment';

describe('QuotationService', () => {
    let service: QuotationService;
    let httpMock: HttpTestingController;
    const headers = new HttpHeaders().set('Authorization', 'Bearer test-token');
    const apiUrl = environment.apiUrl + '/quotation';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [QuotationService],
        });

        service = TestBed.inject(QuotationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('saveQuotation', () => {
        it('sends a POST with the quotation body and headers', () => {
            const body = { customer: { name: 'Juan' }, amount: 100 };
            const mockResponse = { _id: 'q1', ...body };

            service.saveQuotation(body, headers).subscribe((resp) => {
                expect(resp).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(body);
            expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
            req.flush(mockResponse);
        });

        it('propagates the error when the request fails', () => {
            const body = { customer: { name: 'Juan' } };
            let caughtError: any;

            service.saveQuotation(body, headers).subscribe({
                next: () => fail('expected an error'),
                error: (err) => (caughtError = err),
            });

            const req = httpMock.expectOne(apiUrl);
            req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

            expect(caughtError.status).toBe(500);
        });
    });

    describe('listQuotation', () => {
        it('requests the default page/limit when none are provided', () => {
            service.listQuotation(headers).subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === apiUrl && r.params.get('page') === '1' && r.params.get('limit') === '20'
            );
            expect(req.request.method).toBe('GET');
            expect(req.request.params.has('search')).toBeFalse();
            req.flush({ items: [], total: 0, page: 1 });
        });

        it('sends the requested page and limit', () => {
            service.listQuotation(headers, 3, 50).subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === apiUrl && r.params.get('page') === '3' && r.params.get('limit') === '50'
            );
            expect(req.request.method).toBe('GET');
            req.flush({ items: [], total: 0, page: 3 });
        });

        it('includes a trimmed search param only when search is non-empty', () => {
            service.listQuotation(headers, 1, 20, '  Juan Perez  ').subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === apiUrl && r.params.get('search') === 'Juan Perez'
            );
            expect(req.request.params.get('search')).toBe('Juan Perez');
            req.flush({ items: [], total: 0, page: 1 });
        });

        it('omits the search param when it is blank', () => {
            service.listQuotation(headers, 1, 20, '   ').subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === apiUrl && !r.params.has('search')
            );
            expect(req.request.params.has('search')).toBeFalse();
            req.flush({ items: [], total: 0, page: 1 });
        });
    });

    describe('getQuotationById', () => {
        it('sends a GET to /quotation/:id', () => {
            const mockResponse = { _id: 'q1' };

            service.getQuotationById('q1', headers).subscribe((resp) => {
                expect(resp).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${apiUrl}/q1`);
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
        });
    });

    describe('updateQuotation', () => {
        it('sends a PUT to /quotation/:id using _id when present', () => {
            const body = { _id: 'q1', amount: 200 };

            service.updateQuotation(body, headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/q1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(body);
            req.flush(body);
        });

        it('falls back to id when _id is not present', () => {
            const body = { id: 'q2', amount: 200 };

            service.updateQuotation(body, headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/q2`);
            expect(req.request.method).toBe('PUT');
            req.flush(body);
        });
    });

    describe('generatePdf', () => {
        it('sends a POST with the image data url and expects a blob response', () => {
            const imageDataUrl = 'data:image/png;base64,AAA';
            const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });

            service.generatePdf(imageDataUrl, headers).subscribe((resp) => {
                expect(resp).toEqual(mockBlob);
            });

            const req = httpMock.expectOne(`${apiUrl}/pdf`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ image: imageDataUrl });
            expect(req.request.responseType).toBe('blob');
            req.flush(mockBlob);
        });

        it('propagates errors from the backend', () => {
            let caughtError: any;

            service.generatePdf('data:image/png;base64,AAA', headers).subscribe({
                next: () => fail('expected an error'),
                error: (err) => (caughtError = err),
            });

            const req = httpMock.expectOne(`${apiUrl}/pdf`);
            req.flush(new Blob(['boom']), { status: 500, statusText: 'Internal Server Error' });

            expect(caughtError.status).toBe(500);
        });
    });
});
