import { TestBed } from '@angular/core/testing';
import {
    HttpClientTestingModule,
    HttpTestingController,
} from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';

import { ContractService } from './contract.service';
import { environment } from 'src/environments/environment';

describe('ContractService', () => {
    let service: ContractService;
    let httpMock: HttpTestingController;
    const headers = new HttpHeaders().set('Authorization', 'Bearer test-token');
    const apiUrl = environment.apiUrl + '/contract';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ContractService],
        });

        service = TestBed.inject(ContractService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('saveContract', () => {
        it('sends a POST with the contract body and headers', () => {
            const body = { customer: { name: 'Juan' }, amount: 100 };
            const mockResponse = { _id: 'ct1', ...body };

            service.saveContract(body, headers).subscribe((resp) => {
                expect(resp).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(body);
            expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
            req.flush(mockResponse);
        });

        it('propagates errors from the backend', () => {
            let caughtError: any;

            service.saveContract({}, headers).subscribe({
                next: () => fail('expected an error'),
                error: (err) => (caughtError = err),
            });

            const req = httpMock.expectOne(apiUrl);
            req.flush('boom', { status: 500, statusText: 'Internal Server Error' });

            expect(caughtError.status).toBe(500);
        });
    });

    describe('savecontractbyquotation', () => {
        it('sends a POST to /contract/from-quotation', () => {
            const body = { quotationId: 'q1' };
            const mockResponse = { _id: 'ct1', codContract: 'C-1' };

            service.savecontractbyquotation(body, headers).subscribe((resp) => {
                expect(resp).toEqual(mockResponse);
            });

            const req = httpMock.expectOne(`${apiUrl}/from-quotation`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(body);
            req.flush(mockResponse);
        });
    });

    describe('updateContract', () => {
        it('sends a PUT to /contract/', () => {
            const body = { _id: 'ct1', status: 'Pagado' };

            service.updateContract(body, headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(body);
            req.flush(body);
        });

        it('propagates errors from the backend', () => {
            let caughtError: any;

            service.updateContract({}, headers).subscribe({
                next: () => fail('expected an error'),
                error: (err) => (caughtError = err),
            });

            const req = httpMock.expectOne(`${apiUrl}/`);
            req.flush('boom', { status: 424, statusText: 'Failed Dependency' });

            expect(caughtError.status).toBe(424);
        });
    });

    describe('listContract', () => {
        it('sends a GET to /contract', () => {
            service.listContract(headers).subscribe();

            const req = httpMock.expectOne(apiUrl);
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });
    });

    describe('getContractsByYear', () => {
        it('sends a GET to /contract/year/:year', () => {
            const contracts = [{ _id: 'ct1' }];

            service.getContractsByYear(2024, headers).subscribe((resp) => {
                expect(resp).toEqual(contracts);
            });

            const req = httpMock.expectOne(`${apiUrl}/year/2024`);
            expect(req.request.method).toBe('GET');
            req.flush(contracts);
        });
    });

    describe('listContractById', () => {
        it('sends a GET to /contract/:id', () => {
            const contract = { _id: 'ct1' };

            service.listContractById('ct1', headers).subscribe((resp) => {
                expect(resp).toEqual(contract);
            });

            const req = httpMock.expectOne(`${apiUrl}/ct1`);
            expect(req.request.method).toBe('GET');
            req.flush(contract);
        });
    });

    describe('getWeeklySummary', () => {
        it('sends a GET with year and month as query params', () => {
            service.getWeeklySummary(2024, 5, headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/summary/weekly?year=2024&month=5`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });
    });

    describe('getContractsByYearAndStatus', () => {
        it('sends a GET to /contract/year/:year/status/:status', () => {
            service.getContractsByYearAndStatus(2024, 'Por Pagar', headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/year/2024/status/Por%20Pagar`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });

        it('url-encodes special characters in the status', () => {
            service.getContractsByYearAndStatus(2024, 'A&B', headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/year/2024/status/A%26B`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });
    });

    describe('getContractsFiltered', () => {
        it('only includes params that were actually provided', () => {
            service.getContractsFiltered(null, null, null, false, headers).subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === `${apiUrl}/search` && r.params.keys().length === 0
            );
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });

        it('includes year, status, trimmed search and onlyRecent when provided', () => {
            service.getContractsFiltered(2024, 'Pagado', '  Juan  ', true, headers).subscribe();

            const req = httpMock.expectOne(
                (r) =>
                    r.url === `${apiUrl}/search` &&
                    r.params.get('year') === '2024' &&
                    r.params.get('status') === 'Pagado' &&
                    r.params.get('search') === 'Juan' &&
                    r.params.get('onlyRecent') === 'true'
            );
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });

        it('omits the search param when it is blank', () => {
            service.getContractsFiltered(null, null, '   ', false, headers).subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === `${apiUrl}/search` && !r.params.has('search')
            );
            expect(req.request.params.has('search')).toBeFalse();
            req.flush([]);
        });
    });

    describe('getRecentContracts', () => {
        it('sends a GET to /contract/search?onlyRecent=true', () => {
            const contracts = [{ _id: 'ct1' }];

            service.getRecentContracts(headers).subscribe((resp) => {
                expect(resp).toEqual(contracts);
            });

            const req = httpMock.expectOne(`${apiUrl}/search?onlyRecent=true`);
            expect(req.request.method).toBe('GET');
            req.flush(contracts);
        });
    });

    describe('searchContracts', () => {
        it('sends the search term as the q param', () => {
            service.searchContracts('Juan', headers).subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === `${apiUrl}/search` && r.params.get('q') === 'Juan'
            );
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });
    });

    describe('getContractById', () => {
        it('sends a GET to /contract/:id', () => {
            const contract = { _id: 'ct1' };

            service.getContractById('ct1', headers).subscribe((resp) => {
                expect(resp).toEqual(contract);
            });

            const req = httpMock.expectOne(`${apiUrl}/ct1`);
            expect(req.request.method).toBe('GET');
            req.flush(contract);
        });
    });

    describe('getDistrictSummary', () => {
        it('sends a GET with no params when no dates are given', () => {
            service.getDistrictSummary(headers).subscribe();

            const req = httpMock.expectOne(
                (r) => r.url === `${apiUrl}/summary/by-district` && r.params.keys().length === 0
            );
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });

        it('includes fromDate/toDate as query params when provided', () => {
            const summary = [{ district: 'Santiago de Surco', count: 30 }];

            service.getDistrictSummary(headers, '2026-08-01', '2026-09-01').subscribe((resp) => {
                expect(resp).toEqual(summary);
            });

            const req = httpMock.expectOne(
                (r) =>
                    r.url === `${apiUrl}/summary/by-district` &&
                    r.params.get('fromDate') === '2026-08-01' &&
                    r.params.get('toDate') === '2026-09-01'
            );
            expect(req.request.method).toBe('GET');
            req.flush(summary);
        });

        it('propagates errors from the backend', () => {
            let caughtError: any;

            service.getDistrictSummary(headers).subscribe({
                next: () => fail('expected an error'),
                error: (err) => (caughtError = err),
            });

            const req = httpMock.expectOne(`${apiUrl}/summary/by-district`);
            req.flush('boom', { status: 500, statusText: 'Internal Server Error' });

            expect(caughtError.status).toBe(500);
        });
    });

    describe('getContractsByDistrict', () => {
        it('sends a GET to /contract/by-district/:district', () => {
            const contracts = [{ _id: 'ct1', district: 'San Borja' }];

            service.getContractsByDistrict('San Borja', headers).subscribe((resp) => {
                expect(resp).toEqual(contracts);
            });

            const req = httpMock.expectOne(`${apiUrl}/by-district/San%20Borja`);
            expect(req.request.method).toBe('GET');
            req.flush(contracts);
        });

        it('url-encodes accents and special characters in the district name', () => {
            service.getContractsByDistrict('Jesús María', headers).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/by-district/${encodeURIComponent('Jesús María')}`);
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });

        it('includes fromDate/toDate as query params when provided', () => {
            service.getContractsByDistrict('Ate', headers, '2026-08-01', '2026-09-01').subscribe();

            const req = httpMock.expectOne(
                (r) =>
                    r.url === `${apiUrl}/by-district/Ate` &&
                    r.params.get('fromDate') === '2026-08-01' &&
                    r.params.get('toDate') === '2026-09-01'
            );
            expect(req.request.method).toBe('GET');
            req.flush([]);
        });

        it('returns an empty array for a district with no contracts', () => {
            service.getContractsByDistrict('Pucusana', headers).subscribe((resp) => {
                expect(resp).toEqual([]);
            });

            const req = httpMock.expectOne(`${apiUrl}/by-district/Pucusana`);
            req.flush([]);
        });
    });
});
