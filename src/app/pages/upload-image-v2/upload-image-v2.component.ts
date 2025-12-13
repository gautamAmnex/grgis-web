import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CommanService } from '../../services/comman.service';

@Component({
  selector: 'app-upload-image-v2',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-image-v2.component.html',
  styleUrl: './upload-image-v2.component.scss'
})
export class UploadImageV2Component {
  @ViewChild('fileInput', { static: false }) fileInputRef?: any;

  previewUrl: SafeUrl | null = null;
  file: any = null;
  error: string | null = null;        // <- explicit nullable type
  isUploading = false;
  showDetail:boolean = false
  readonly maxFileSize = 5 * 1024 * 1024;
  readonly accept:any = ['image/png', 'image/jpeg', 'image/jpg'];

  private objectUrl: string | null = null;

  constructor(private sanitizer: DomSanitizer, private commanService: CommanService) {}
  gender_actual:any
  age_actual:any
  actual_fileName:any = []

  onFileSelected(ev: any) {
    this.actual_fileName = []
    this.clearError();
  
    const input = ev?.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
  
    this.handleNewFile(file);
  
    if (file) {
      // console.log("File Name:", file.name);
      const filename = file.name;
      this.actual_fileName = filename

// Remove extension + split
const parts = filename.replace(".jpg", "").split("_");

const gender = parts[1] || "";
const age = Number(parts[2]);
this.age_actual = age
// Validate gender
this.gender_actual = (gender === "Male" || gender === "Female") ? gender : "No Data";

// Age categories
const categories = [
  { min: 0,  max: 10,  label: "0-10" },
  { min: 11, max: 20,  label: "11-20" },
  { min: 21, max: 30,  label: "21-30" },
  { min: 31, max: 40,  label: "31-40" },
  { min: 41, max: 50,  label: "41-50" },
  { min: 51, max: 60,  label: "51-60" },
  { min: 61, max: 200, label: "61+" },
];

this.age_actual = "No Data"; // default

for (const cat of categories) {
  if (age >= cat.min && age <= cat.max) {
    this.age_actual = age;
    break;
  }
}

// console.log("Gender:", this.gender_actual);
// console.log("Age Category:", this.age_actual);
    }
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.clearError();
    const file = ev.dataTransfer?.files?.[0] ?? null;
    this.handleNewFile(file);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  private handleNewFile(file: File | null) {
    this.imageDetail = {}
    this.revokeObjectUrl();
    this.previewUrl = null;
    this.file = null;
    this.showDetail = false
    this.errorText = undefined
    if (!file) return;

    if (!this.accept.includes(file.type)) {
      this.error = 'Only PNG/JPEG/WebP/GIF images allowed.';
      return;
    }

    if (file.size > this.maxFileSize) {
      this.error = 'File too large. Max 5 MB allowed.';
      return;
    }

    this.objectUrl = URL.createObjectURL(file);
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
    this.file = file;
  }

  removeImage() {
    this.revokeObjectUrl();
    this.previewUrl = null;
    this.file = null;
    this.errorText = undefined
    this.clearError();
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    this.showDetail = false
  }

  errorText:any = false
  async uploadImage() {
    this.imageDetail = {}
    this.clearError();
    if (!this.file) {
      this.error = 'Please select an image first.';
      return;
    }
  
    this.isUploading = true;
  
    try {
      // await the conversion to get the actual data URL string
      const base64DataUrl = await this.fileToBase64(this.file as File);
      // base64DataUrl will be like: "data:image/png;base64,iVBORw0K..."
  
      const payload = {
        image_base64: base64DataUrl,
        image_name: this.actual_fileName
      };

      this.commanService.loaderSpinShow()
      this.commanService.pridictMultiImage(payload).subscribe(
        (res: any) => {
          this.commanService.loaderSpinHide()
          this.isUploading = false;
          this.showDetail = true;
          this.imageDetail = res
          if(!res.is_human){
            this.errorText = "Please upload only valid photograph of male female or transgender."
          }
          // console.log('response', res);
        },
        (err: any) => {
          this.commanService.loaderSpinHide()
          this.isUploading = false;
          this.showDetail = false;
          this.error = 'Upload failed';
          // console.error(err);
          this.imageDetail = {}
          this.errorText = undefined
        }
      );
  
    } catch (err) {
      // console.error('uploadImage error:', err);
      this.error = 'Unable to convert/upload image.';
      this.isUploading = false;
      this.showDetail = false;
      this.imageDetail = {}
    }
  }
  

  private revokeObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private clearError() {
    this.error = null;
  }


  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = () => {
        const dataUrl = reader.result as string;                 // "data:image/png;base64,AAAA..."
        const pureBase64 = dataUrl.split(',')[1];                // "AAAAAA...." (prefix removed)
        resolve(pureBase64);
      };
  
      reader.onerror = err => reject(err);
  
      reader.readAsDataURL(file);
    });
  }
  

imageDetail:any = {}
  get isHumanText_actule(): string {
    return this.imageDetail?.is_human ? 'Yes' : 'No';
  }
  
  get genderText_actule(): string {
    return this.imageDetail?.gender === 'no_data'
      ? 'No Data'
      : this.capitalize(this.imageDetail?.gender || 'No Data');
  }
  
  get ageText_actule(): string {
    return this.imageDetail?.age === 'no_data'
      ? 'No Data'
      : this.imageDetail.age;
  }
  get isHumanText_pridict(): string {
    return this.imageDetail?.is_human_pridict ? 'Yes' : 'No';
  }
  
  get genderText_pridict(): string {
    return this.imageDetail?.gender_pridict  === 'no_data'
      ? 'No Data'
      : this.capitalize(this.imageDetail?.gender_pridict  || 'No Data');
  }
  
  get ageText_pridict(): string {
    return this.imageDetail?.age_pridict  === 'no_data'
      ? 'No Data'
      : this.imageDetail.age_pridict ;
  }
  
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  
  ageMatchesCategory(): boolean {
   const categories = [
      { min: 0,  max: 10,  label: "0-10" },
      { min: 11, max: 20,  label: "11-20" },
      { min: 21, max: 30,  label: "21-30" },
      { min: 31, max: 40,  label: "31-40" },
      { min: 41, max: 50,  label: "41-50" },
      { min: 51, max: 60,  label: "51-60" },
      { min: 61, max: 200, label: "61+" },
    ];
    // No data cases
    if (
      this.age_actual === null ||
      this.age_actual === undefined ||
      this.ageText_actule === 'No Data'
    ) {
      return false;
    }
  
    const category = categories.find(
      c => c.label === this.ageText_actule
    );
  
    if (!category) {
      return false;
    }
  
    return this.age_actual >= category.min &&
           this.age_actual <= category.max;
  }
  

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }



}
