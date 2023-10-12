import { Component, EventEmitter, Input, Output} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  //@Input() message: string;
  @Output() customEvent = new EventEmitter<any>();
  constructor(private router: Router) { }
  
  ngOnInit() {
    this.customEvent.emit('Hello from child');
  }
  
  isOnDashboardRoute(): boolean {
    console.log("estado de rutaaaaaa:",this.router.url === '/dashboard')
    return this.router.url === '/dashboard';
  }

}
