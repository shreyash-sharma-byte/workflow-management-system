import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  template: `
    <div class="app-layout">
      <app-sidebar></app-sidebar>
      <div class="app-main">
        <app-header></app-header>
        <div class="app-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
})
export class LayoutComponent {}
