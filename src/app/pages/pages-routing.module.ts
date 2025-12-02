import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PagesComponent } from './pages.component';
import { ReportDashboardComponent } from './report-dashboard/report-dashboard.component';
import { UploadImageComponent } from './upload-image/upload-image.component';
import { CompareImageComponent } from './compare-image/compare-image.component';
import { MultipleImageUploadComponent } from './multiple-image-upload/multiple-image-upload.component';

const routes: Routes = [
  {
    path: '',
    component: PagesComponent,
    children: [
      { path: '', redirectTo: 'report-dashboard', pathMatch: 'full' },
      { path: 'report-dashboard', component: ReportDashboardComponent },
      { path: 'upload-image', component: UploadImageComponent },
      { path: 'compare-image', component: CompareImageComponent },
      { path: 'upload-images', component: MultipleImageUploadComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
