import { HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Output, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../Servicios/authentication.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  @Output() customEvent = new EventEmitter<any>();
  @ViewChild('errorModal') errorModal!: TemplateRef<any>;

  username = '';
  password = '';

  // 👇 ruta a donde redirigir después del login
  redirectUrl: string = '/dashboard';

  constructor(
    private authenticationToken: AuthenticationToken,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    // Leer el parámetro redirect de la URL, por ejemplo:
    // /app-login?redirect=/dashboard/calendar
    const redirect = this.activatedRoute.snapshot.queryParamMap.get('redirect');
    if (redirect) {
      this.redirectUrl = redirect;
      console.log('Redirect configurado a:', this.redirectUrl);
    }
  }

  onSubmit() {
    console.log('Username: ', this.username);
    console.log('Password: ', this.password);

    const payload = {
      userName: this.username,
      password: this.password
    };

    const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');

    this.authenticationService.sendPostRequest(payload, headers).subscribe(
      (data: any) => {
        if (data.status === undefined) {
          console.log(data.token);

          // Guardar token y usuario como ya tenías
          this.authenticationToken.myValue = data.token;
          this.authenticationToken.user = this.username;

          console.log('this.authenticationToken.myValue ', this.authenticationToken.myValue);
          console.log('informacion de validacion ', data.status);

          // 🔥 Antes: this.route.navigate(['dashboard']);
          // Ahora: navegar a la ruta que vino en redirect o a /dashboard por defecto
          this.route.navigateByUrl(this.redirectUrl);
        }
      },
      (error) => {
        if (error.status === 401) {
          console.log('usuario o claves incorrectos');
          this.openErrorModal();
        } else {
          console.log('error desconocido en el login');
        }
      }
    );
  }

  openErrorModal() {
    this.modalService.open(this.errorModal, { centered: true });
  }
}
