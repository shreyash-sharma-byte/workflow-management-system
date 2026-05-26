import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
    <app-loading-spinner></app-loading-spinner>
    <app-toast-container></app-toast-container>
  `,
})
export class AppComponent {}
