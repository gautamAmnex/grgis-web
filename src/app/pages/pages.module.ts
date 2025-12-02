import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages-routing.module';
import { ReportDashboardComponent } from './report-dashboard/report-dashboard.component';
import { UploadImageComponent } from './upload-image/upload-image.component';
import { HttpClientModule } from '@angular/common/http';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; 
import { CompareImageComponent } from './compare-image/compare-image.component';
import { PagesComponent } from './pages.component';
import { NgxEchartsModule } from 'ngx-echarts';
import 'echarts/theme/macarons.js';
import { MultipleImageUploadComponent } from './multiple-image-upload/multiple-image-upload.component';
import { DialogModule } from 'primeng/dialog';import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
@NgModule({
  declarations: [
    PagesComponent,
    ReportDashboardComponent,
    UploadImageComponent,
    CompareImageComponent,
    MultipleImageUploadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MultiSelectModule,
    PagesRoutingModule,
    DropdownModule,
    TableModule ,
    DialogModule ,
    ButtonModule,
    ToastModule
    // NgxEchartsModule.forRoot({ echarts: () => import('echarts') })
    // BrowserModule,
    // BrowserAnimationsModule
  ],
  providers: [MessageService],
  bootstrap: [PagesComponent]
})
export class PagesModule { }
