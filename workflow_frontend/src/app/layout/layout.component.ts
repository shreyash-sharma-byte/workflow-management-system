import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  template: `
    <div class="app-layout">
      <app-sidebar [open]="sidebarOpen" (close)="sidebarOpen = false"></app-sidebar>
      <div class="mobile-backdrop" *ngIf="sidebarOpen" (click)="sidebarOpen = false"></div>
      <div class="app-main">
        <app-header (toggleSidebar)="toggleSidebar()"></app-header>
        <div class="app-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  sidebarOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
