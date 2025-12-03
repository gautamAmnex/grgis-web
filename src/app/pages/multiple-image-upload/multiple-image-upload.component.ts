import { Component, ElementRef, OnDestroy, ViewChild } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { CommanService } from "../../services/comman.service";

@Component({
  selector: "app-multiple-image-upload",
  templateUrl: "./multiple-image-upload.component.html",
  styleUrl: "./multiple-image-upload.component.scss",
})
export class MultipleImageUploadComponent {
  @ViewChild("fileInput", { static: false }) fileInputRef: any;

  file: any;
  error: any;
  isUploading = false;
  showDetail = false;
  resultText = "";

  readonly acceptType = "application/zip";

  constructor(private commanService: CommanService) {
    this.showTableLoader = false;
  }

  onFileSelected(event: any) {
    this.clearError();
    const file = event?.target?.files?.[0] ?? null;
    this.processFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.clearError();
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.processFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private processFile(file: File | null) {
    this.showTableLoader = false;
    this.file = null;
    this.showDetail = false;
    this.outputDataTable = [];
    this.errorText = undefined;
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      this.error = "Only ZIP files are allowed.";
      return;
    }

    this.file = file; // ZIP is valid
  }

  removeFile() {
    this.showTableLoader = false;
    this.file = null;
    this.error = null;
    this.outputDataTable = [];
    this.errorText = undefined;
    this.showDetail = false;
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = "";
    }
  }

  outputDataTable: any = [];
  errorText: any;
  showTableLoader: any = false;
  totalRecords: any = 0;
  async uploadZip() {
    this.outputDataTable = [];
    this.totalRecords = 0;
    this.errorText = undefined;
    if (!this.file) {
      this.error = "Please select a ZIP file.";
      return;
    }
    this.showTableLoader = false;
    this.commanService.loaderSpinShow();
    this.isUploading = true;
    let data: any = [];
    let formData = new FormData();
    this.globleUUid = [];
    formData.append("file", this.file);
    this.commanService.pridictsZipImageNew(formData).subscribe({
      // this.commanService.pridictsZipImage(formData).subscribe({
      next: (response: any) => {
        this.globleUUid = response; 
        // response.processed_image =
        //   "data:image/jpeg;base64," + response.processed_image;
        // if (response.id) {
        //   this.outputDataTable.push(response);
        // }
        // this.commanService.loaderSpinHide();
        // this.showDetail = true;
        // this.showTableLoader = true;
        // this.totalRecords = this.outputDataTable.length;
      },
      error: (error: any) => {
        console.log(error.error);
        this.outputDataTable = [];
        this.showDetail = false;
        this.showTableLoader = false;
        this.totalRecords = 0;
      },
      complete: () => {
        console.log(this.outputDataTable);

        this.peginationApi();
        this.isUploading = false;
        this.showTableLoader = false;
      },
    });
  }

  private clearError() {
    this.error = null;
  }

  isHumanText(is_human: any): string {
    return is_human ? "Yes" : "No";
  }

  genderText(gender: any): string {
    return gender === "no_data" ? "--" : this.capitalize(gender || "--");
  }

  ageText(age: any): string {
    return age === "no_data" ? "--" : age;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  visible = false;
  img: any;
  click(data: any) {
    this.visible = true;

    this.commanService.loaderSpinShow();
    console.log(data);
    this.img = "";
    var payload = {
      id: data.id,
      fileName: data.filename,
    };
    this.commanService.preview(payload).subscribe(
      (res) => {
        this.img = "data:image/jpeg;base64," + res.thumbnail_base64;
        console.log(this.img);

        this.commanService.loaderSpinHide();
      },
      (error) => {
        this.commanService.loaderSpinHide();
      }
    );
  }

  closeDialog() {
    this.visible = false;
  }

  // firstss: any;

  // rowss: any;
  // datasource: any = [];
  // loadData(event: any) {
  //   // this.loading = true;
  //   this.first = event.first;
  //   this.rows = event.rows;
  //   this.page = event.first! / this.rows;
  //   setTimeout(() => {
  //     if (this.datasource.length !== 0) {
  //       this.firstss = event.first;
  //       this.rowss = event.rows;
  //       this.outputDataTable = this.datasource.slice(
  //         event.first,
  //         this.firstss + this.rowss
  //       );
  //       this.rows = event.rows!;
  //       this.peginationApi();
  //       // this.loading = false;

  //       // const pageNumber = this.firstss / 30
  //     }
  //   }, 1000);
  // }

  // first = 0; // PrimeNG always starts at 0
  // rows = 3;
  // page = 1; // backend first page = 1
  // peginationApi() {
  //   this.showTableLoader = true;
  //   this.outputDataTable = []; // clear old data

  //   let payload = {
  //     uuid_a: this.globleUUid.uuid_a,
  //     page: this.first / this.rows + 1, // backend needs 1-based index
  //     size: this.rows,
  //   };

  //   this.commanService.getAllData(payload).subscribe({
  //     next: (response: any) => {
  //       response.results.forEach((response2: any) => {
  //         response2.base64 = "data:image/jpeg;base64," + response2.base64;
  //         this.outputDataTable.push(response2);
  //       });

  //       this.datasource = [...this.outputDataTable]; // force update

  //       this.showDetail = true;
  //       this.totalRecords = this.globleUUid.total_images;
  //     },
  //     error: (error: any) => {
  //       console.log(error.error);
  //       this.outputDataTable = [];
  //       this.datasource = [];
  //       this.showDetail = false;
  //       this.totalRecords = 0;
  //     },
  //     complete: () => {
  //       this.isUploading = false;
  //       this.showTableLoader = false; // hide loader AFTER request
  //     },
  //   });
  // }

  first = 0;
  rows = 10;
  page = 1;

  datasource: any[] = [];

  loadData(event: any) {
    this.first = event.first; // 0, 3, 6, 9...
    this.rows = event.rows; // rows per page
    this.page = event.first / event.rows + 1; // backend page (1-based)

    this.showTableLoader = false;
    this.peginationApi();
  }

  peginationApi() {
    this.showTableLoader = true;

    let payload = {
      uuid_a: this.globleUUid.uuid_a,
      page: this.page, // correct 1-based page
      size: this.rows, // page size
    };

    this.outputDataTable = []; // clear old data

    this.commanService.getAllData(payload).subscribe({
      next: (response: any) => {
        // backend result
        this.totalRecords = this.globleUUid.total_images;
        console.log(this.totalRecords);
        response.results.forEach((item: any) => {
          item.base64 = "data:image/jpeg;base64," + item.base64;
          this.outputDataTable.push(item);
        });

        // PrimeNG table source
        this.datasource = [...this.outputDataTable];

        this.showTableLoader = false;
        this.showDetail = true;

        console.log(this.outputDataTable);
        this.commanService.loaderSpinHide();
      },
      error: (err) => {
        console.log(err.error);
        this.outputDataTable = [];
        this.datasource = [];
        this.totalRecords = 0;
        this.showDetail = false;

        this.commanService.loaderSpinHide();
      },
      complete: () => {
        this.showTableLoader = false;

        this.commanService.loaderSpinHide();
      },
    });
  }

  globleUUid: any;
}
