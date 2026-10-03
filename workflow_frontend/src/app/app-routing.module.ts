import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, AdminGuard, InitiatorGuard, unauthenticatedGuard } from './core/auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { LandingComponent } from './features/landing/landing.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { TemplateListComponent } from './features/templates/template-list/template-list.component';
import { TemplateCreateComponent } from './features/templates/template-create/template-create.component';
import { TemplateDetailComponent } from './features/templates/template-detail/template-detail.component';
import { StationBuilderComponent } from './features/templates/station-builder/station-builder.component';
import { TransitionBuilderComponent } from './features/templates/transition-builder/transition-builder.component';
import { InstanceListComponent } from './features/instances/instance-list/instance-list.component';
import { InstanceCreateComponent } from './features/instances/instance-create/instance-create.component';
import { InstanceDetailComponent } from './features/instances/instance-detail/instance-detail.component';
import { PublicInstanceWrapperComponent } from './features/instances/public-instance/public-instance-wrapper.component';
import { NotificationsPageComponent } from './features/notifications/notifications-page.component';

const routes: Routes = [
  // ── Public Instance View (standalone micro-frontend, no admin chrome) ──
  { path: 'w/:token', component: PublicInstanceWrapperComponent },

  // ── Public landing (pre-login "what this app does" screen) ──
  // Matched only while signed out; signed-in users fall through to the layout.
  { path: '', component: LandingComponent, canMatch: [unauthenticatedGuard] },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // ── Primary Views ──────────────────────────────
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },

      // ── Work Items: My Tasks (NEW — operator-first) ─
      {
        path: 'my-tasks',
        component: InstanceListComponent,  // Reuses instance list; can be swapped for dedicated component later
        data: { filter: 'my-tasks' },
      },

      // ── Templates ──────────────────────────────────
      { path: 'templates', component: TemplateListComponent },
      { path: 'templates/new', component: TemplateCreateComponent, canActivate: [AdminGuard] },
      { path: 'templates/:id', component: TemplateDetailComponent },
      { path: 'templates/:id/stations', component: StationBuilderComponent, canActivate: [AdminGuard] },
      { path: 'templates/:id/transitions', component: TransitionBuilderComponent, canActivate: [AdminGuard] },

      // ── Instances ──────────────────────────────────
      { path: 'instances', component: InstanceListComponent },
      { path: 'instances/new', component: InstanceCreateComponent, canActivate: [InitiatorGuard] },
      { path: 'instances/:id', component: InstanceDetailComponent },

      // ── Notifications ──────────────────────────────
      { path: 'notifications', component: NotificationsPageComponent },

      // ── Admin Panel (NEW — admin only) ─────────────
      {
        path: 'admin',
        component: DashboardComponent,
        canActivate: [AdminGuard],
        data: { view: 'admin' },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
