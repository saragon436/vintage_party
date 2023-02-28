import { HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { debounceTime, distinctUntilChanged, filter, map, Observable, Subject, takeUntil, tap } from 'rxjs';
import { CustomerService } from '../Servicios/customer.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CustomerComponent } from '../customer/customer.component';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AccessoryService } from '../Servicios/accessory.service';
import { ContractService } from '../Servicios/contract.service';

interface Customer {
  name: string;
  documentNumber: string;
  address: string;
  phone: string;
}

interface Accessory {
  _id: string;
  description: string;
  color: string;
  design: string;
  large: string;
  bottom: string;
  high: string;
  stock: number;
  status: boolean;
}

@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css']
})
export class ContractComponent {

  form: FormGroup;
  customer: Customer[];
  accessories: Accessory[];
  public unsubscribe: Subject<void>;

  constructor(
    private modalService: NgbModal,
    private customerService: CustomerService,
    private accessoryService: AccessoryService,
    private contractService: ContractService,
    private authenticationToken: AuthenticationToken,
    private route: Router,
    private formBuilder: FormBuilder) {
      this.unsubscribe = new Subject();
      this.customer = [];
      this.accessories = [];
      this.form = this.formBuilder.group({
        search: new FormControl(''),
        number: new FormControl('', Validators.required),
        onAccount: new FormControl(0, Validators.required),
        saldo: new FormControl(0, Validators.required),
        installDate: new FormControl('', Validators.required),
        eventDate: new FormControl('', Validators.required),
        pickupDate: new FormControl('', Validators.required),
        amount: new FormControl(0, Validators.required),
        comment: new FormControl('', Validators.required),
        listAccessories: this.formBuilder.array([])
      });
  }


  openModal() {
    this.modalService.open(CustomerComponent, { centered: true });
  }

  ngOnInit() {
    const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
    console.log('this.authenticationToken ' + this.authenticationToken)
    this.customerService.listCustomer(headers).pipe(takeUntil(this.unsubscribe)).subscribe(
      (customer) => {
        this.customer = customer;
        console.log('customer ' + this.customer);
      },
      (error) => {

        if (error.status === 401) {

          console.log('usuario o claves incorrectos');

        } else {
          console.log('error desconocido en el login');
        }
      });

    this.searchStock();
  }

  get arrayAccessory(): FormArray {
    return this.form.controls['listAccessories'] as FormArray
  }

  get arrayValuesAccessory(): any[] {
    return this.arrayAccessory.value as any[]
  }

  onAddItem(element: HTMLSelectElement) {

    if (element.value !== '') {

      if (this.arrayValuesAccessory.find(q => q.id === element.value)) {
        element.value = "";

        return;
      }

      const item = this.accessories.find(x => x._id === element.value);
      this.arrayAccessory
        .push(
          this.formBuilder.group({
            id: new FormControl(item?._id),
            description: item?.description,
            amount: new FormControl(1, [Validators.required, Validators.max(item?.stock || 0), Validators.min(1)]),
            stock: new FormControl(item?.stock)
          })
        );
    }

    element.value = "";
  }

  onDeleteItem(index: number) {
    this.arrayAccessory.removeAt(index);
  }

  onSave() {

    if (this.form.valid) {
      const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
      const values = {...this.form.value, onAccount: []}
      this.contractService.saveContract(values, headers).subscribe(
        (resp) => {
          console.log('RESPUESTAs', resp);
        }
      )
    }
    console.log(222)
  }

  searchStock() {
    this.form.valueChanges
      .pipe(
        takeUntil(this.unsubscribe),
        debounceTime(50),
        distinctUntilChanged((prev, curr) => prev.installDate === curr.installDate && prev.pickupDate === curr.pickupDate)
      )
      .subscribe(
        (value) => {
          if (value.installDate !== '' && value.pickupDate !== '' && value.installDate < value.pickupDate) {
            this.arrayAccessory.clear();
            const headers = new HttpHeaders().set('Authorization', 'Bearer ' + this.authenticationToken.myValue);
            this.accessoryService.listStockAccessory(headers, { "installDate": value.installDate, "pickupDate": value.pickupDate }).subscribe(
              (accessories) => {
                this.accessories = accessories;
              },
              (error) => {
                if (error.status === 401) {
                  console.log('token invalido');
                } else {
                  console.log('error al obtener el stock', error);
                }
              });
          }
        }
      );
  }
  
  searchs = (text$: Observable<string>) =>
    text$.pipe(
      takeUntil(this.unsubscribe),
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : Object.values(this.customer).filter(v => v.name.indexOf(term.toLowerCase()) > -1).slice(0, 10))
    );

  ngOnDestroy(): void {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
