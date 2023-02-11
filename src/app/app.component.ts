import { Component } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'vintage_party';
  constructor(private router: Router) {}

  navigateToTarget() {
    this.router.navigate(['/app-login']);
  }
}
