import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, AdminGuard, InitiatorGuard } from './core/auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { TemplateListComponent } from './features/templates/template-list/template-list.component';
import { TemplateCreateComponent } from './features/templates/template-create/template-create.component';
import { TemplateDetailComponent } from './features/templates/template-detail/template-detail.component';
import { StationBuilderComponent } from './features/templates/station-builder/station-builder.component';
import { TransitionBuilderComponent } from './features/templates/transition-builder/transition-builder.component';
import { InstanceListComponent } from './features/instances/instance-list/instance-list.component';
import { InstanceCreateComponent } from './features/instances/instance-create/instance-create.component';
import { InstanceDetailComponent } from './features/instances/instance-detail/instance-detail.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },

      // Templates (Admin only for create/edit)
      { path: 'templates', component: TemplateListComponent },
      { path: 'templates/new', component: TemplateCreateComponent, canActivate: [AdminGuard] },
      { path: 'templates/:id', component: TemplateDetailComponent },
      { path: 'templates/:id/stations', component: StationBuilderComponent, canActivate: [AdminGuard] },
      { path: 'templates/:id/transitions', component: TransitionBuilderComponent, canActivate: [AdminGuard] },

      // Instances
      { path: 'instances', component: InstanceListComponent },
      { path: 'instances/new', component: InstanceCreateComponent, canActivate: [InitiatorGuard] },
      { path: 'instances/:id', component: InstanceDetailComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
