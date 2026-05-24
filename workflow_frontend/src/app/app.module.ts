import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { keycloakInitializer } from './core/auth/keycloak-init';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

import { LayoutComponent } from './layout/layout.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';

import { DashboardComponent } from './features/dashboard/dashboard.component';
import { TemplateListComponent } from './features/templates/template-list/template-list.component';
import { TemplateCreateComponent } from './features/templates/template-create/template-create.component';
import { TemplateDetailComponent } from './features/templates/template-detail/template-detail.component';
import { StationBuilderComponent } from './features/templates/station-builder/station-builder.component';
import { TransitionBuilderComponent } from './features/templates/transition-builder/transition-builder.component';
import { InstanceListComponent } from './features/instances/instance-list/instance-list.component';
import { InstanceCreateComponent } from './features/instances/instance-create/instance-create.component';
import { InstanceDetailComponent } from './features/instances/instance-detail/instance-detail.component';
import { TaskExecutionComponent } from './features/instances/task-execution/task-execution.component';

@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent, SidebarComponent, HeaderComponent,
    DashboardComponent,
    TemplateListComponent, TemplateCreateComponent, TemplateDetailComponent,
    StationBuilderComponent, TransitionBuilderComponent,
    InstanceListComponent, InstanceCreateComponent, InstanceDetailComponent,
    TaskExecutionComponent,
  ],
  imports: [
    BrowserModule, HttpClientModule,
    FormsModule, ReactiveFormsModule,
    KeycloakAngularModule,
    AppRoutingModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: keycloakInitializer,
      multi: true,
      deps: [KeycloakService],
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
