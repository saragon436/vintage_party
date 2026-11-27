import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ContractService } from './contract.service';
import { environment } from '../../environments/environment';

describe('ContractService customer change routing', () => {
  let service: ContractService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ContractService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends customer changes to the transactional endpoint with authentication', () => {
    const body = { _id: 'contract', customerId: 'new-customer', expectedCustomerKey: 'old-customer' };
    service.updateContract(body, new HttpHeaders({ Authorization: 'Bearer test-token' })).subscribe();
    const req = http.expectOne(environment.apiUrl + '/contract/customer');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(req.request.body).toEqual(body);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('keeps normal edits, states and payments on the existing endpoint', () => {
    const body = { _id: 'contract', address: 'Av. Nueva', status: 'Pagado' };
    service.updateContract(body, new HttpHeaders()).subscribe();
    const req = http.expectOne(environment.apiUrl + '/contract/');
    expect(req.request.body).toEqual(body);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
