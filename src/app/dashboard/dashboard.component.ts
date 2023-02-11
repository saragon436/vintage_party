import { Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  //@Input() message: string;
  @Output() customEvent = new EventEmitter<any>();
  ngOnInit() {
    this.customEvent.emit('Hello from child');
  }
}
