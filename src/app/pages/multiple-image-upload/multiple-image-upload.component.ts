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
  showDetail = true;
  resultText = "";

  readonly acceptType = "application/zip";

  constructor(private commanService: CommanService) {}

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
    let formData = new FormData();
    formData.append("file", this.file);
    this.commanService.pridictsZipImage(formData).subscribe({
      next: (response: any) => {
        console.log(this.outputDataTable);
        response.processed_image =
          "data:image/jpeg;base64," + response.processed_image;
        if (response.id) {
          this.outputDataTable.push(response);
        }
        this.commanService.loaderSpinHide();
        this.showDetail = true;
        this.showTableLoader = true;
        this.totalRecords = this.outputDataTable.length;
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
  visible =  false ; 
  img: any;
  click(data: any) {
    this.visible = true
    
    this.commanService.loaderSpinShow()
    console.log(data);
    this.img = "";
    var payload = {
      id: data.id,
      fileName: data.filename,
    };
    this.commanService.preview(payload).subscribe((res) => {
      this.img = "data:image/jpeg;base64," + res.thumbnail_base64;
      console.log( this.img )
      
      this.commanService.loaderSpinHide()
    } ,
    (error)=>{
      this.commanService.loaderSpinHide()
    });
  }


  closeDialog() {
    this.visible = false
  }
}
