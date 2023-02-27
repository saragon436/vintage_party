import { HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { AuthenticationService } from '../Servicios/authentication.service';
import { Router } from '@angular/router';
import { AuthenticationToken } from '../Servicios/autentication-token.service'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent {
  @Output() customEvent = new EventEmitter<any>();
  constructor(private authenticationToken:AuthenticationToken,private route: Router, private authenticationService: AuthenticationService) { }

  username = '';
  password = '';

  onSubmit() {
    console.log('Username: ', this.username);
    console.log('Password: ', this.password);
    var payload = {
      userName: this.username,
      password: this.password
    };
    console.log(payload);
    //this.customEvent.emit('Hello from parent');
    //const headers = new HttpHeaders().set('Authorization', 'Bearer ' + token);
    const headers = new HttpHeaders().set('Access-Control-Allow-Origin', '*');
    this.authenticationService.sendPostRequest(payload, headers).subscribe(
      (data: any) => {
        if (data.status === undefined) {
          console.log(data.token);
          this.authenticationToken.myValue = data.token;
          console.log('this.authenticationToken.myValue ',this.authenticationToken.myValue)
          console.log('informacion de validacion ', data.status)
          this.route.navigate(['dashboard']);
        }
      },
      (error) => {
        
        if( error.status === 401){
        
          console.log('usuario o claves incorrectos');
  
        }else{
          console.log('error desconocido en el login');
        }
      });


  }
}
