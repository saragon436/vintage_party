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
  isSubmitting = false;
  errorMessage = '';

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
    if (this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;

    const payload = {
      userName: this.username,
      password: this.password
    };

    const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');

    this.authenticationService.sendPostRequest(payload, headers).subscribe(
      (data: any) => {
        this.isSubmitting = false;
        if (data.status === undefined) {
          // Guardar token y usuario como ya tenías
          this.authenticationToken.myValue = data.token;
          this.authenticationToken.user = this.username;

          // 🔥 Antes: this.route.navigate(['dashboard']);
          // Ahora: navegar a la ruta que vino en redirect o a /dashboard por defecto
          this.route.navigateByUrl(this.redirectUrl);
        }
      },
      (error) => {
        this.isSubmitting = false;
        if (error.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos. Por favor, inténtelo de nuevo.';
        } else if (error.status === 400) {
          this.errorMessage = 'Verifique que el usuario y la contraseña sean válidos (la contraseña debe tener al menos 8 caracteres).';
        } else {
          this.errorMessage = 'No se pudo conectar con el servidor. Intente nuevamente en unos minutos.';
        }
        this.openErrorModal();
      }
    );
  }

  openErrorModal() {
    this.modalService.open(this.errorModal, { centered: true });
  }
}
