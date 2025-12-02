import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CommanService } from '../../services/comman.service';

@Component({
  selector: 'app-compare-image',
  templateUrl: './compare-image.component.html',
  styleUrl: './compare-image.component.scss'
})
export class CompareImageComponent {
  @ViewChild('fileInput1', { static: false }) fileInput1Ref?: any;
  @ViewChild('fileInput2', { static: false }) fileInput2Ref?: any;

  // keep arrays indexed [0] and [1]
  previewUrl:any= [null, null];
  file:any = [null, null];
  error: any = [null, null];
  showDetail: boolean = false;

  isUploading = false;

  readonly maxFileSize = 5 * 1024 * 1024;
  readonly accept:any = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  private objectUrl: any = [null, null];

  constructor(private sanitizer: DomSanitizer, private commanService: CommanService) {}

  // Common handlers accept index (0 or 1)
  onFileSelected(ev: Event | null, idx: number) {
    this.clearError(idx);
    const input = ev?.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.handleNewFile(file, idx);
  }

  onDrop(ev: DragEvent, idx: number) {
    ev.preventDefault();
    this.clearError(idx);
    const file = ev.dataTransfer?.files?.[0] ?? null;
    this.handleNewFile(file, idx);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  private handleNewFile(file: File | null, idx: number) {
    this.similarityScore = null
    this.similarityPercent = null
    this.statusText = null
    this.errorText = undefined
    this.revokeObjectUrl(idx);
    this.previewUrl[idx] = null;
    this.file[idx] = null;
    this.showDetail = false;
    this.error[idx] = null;

    if (!file) return;

    if (!this.accept.includes(file.type)) {
      this.error[idx] = 'Only PNG/JPEG/WebP/GIF images allowed.';
      return;
    }

    if (file.size > this.maxFileSize) {
      this.error[idx] = 'File too large. Max 5 MB allowed.';
      return;
    }

    this.objectUrl[idx] = URL.createObjectURL(file);
    this.previewUrl[idx] = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl[idx] as string);
    this.file[idx] = file;
    
  }

  removeImage(idx: number) {
    this.revokeObjectUrl(idx);
    this.previewUrl[idx] = null;
    this.file[idx] = null;
    this.clearError(idx);
    this.showDetail = false;

    // reset file input native element value
    if (idx === 0 && this.fileInput1Ref?.nativeElement) {
      this.fileInput1Ref.nativeElement.value = '';
    }
    if (idx === 1 && this.fileInput2Ref?.nativeElement) {
      this.fileInput2Ref.nativeElement.value = '';
    }
  }

  similarityScore: number | null = null;
similarityPercent: number | null = null;
statusText: string | null = null;
errorText:any
  // Final combined upload
  async uploadAll() {
    this.similarityScore = null
    this.similarityPercent = null
    this.statusText = null
    this.errorText = undefined
    this.clearError(0);
    this.clearError(1);
  
    if (!this.canUploadAll()) {
      return;
    }
  
    this.isUploading = true;
  
    try {
      // === CORRECT: await both promises in parallel ===
      const [img1DataUrl, img2DataUrl] = await Promise.all([
        this.fileToBase64(this.file[0] as File),
        this.fileToBase64(this.file[1] as File)
      ]);
  
  
      const payload = {
        api_key: 'MMRDA/FR/API/SERVER/1',
        image1: img1DataUrl,
        image2: img2DataUrl
      };
      this.commanService.loaderSpinShow()
      // call your API
      this.commanService.pridictsimilarityImage(payload).subscribe(
        (res: any) => {
          this.commanService.loaderSpinHide()
             // safe-guard in case response shape changes
          this.similarityScore = typeof res?.similarity_score === 'number' ? res.similarity_score : null;
          this.similarityPercent = this.similarityScore !== null ? this.similarityScore * 100 : null;
          this.statusText = this.formatStatus(res?.status ?? null);
          this.isUploading = false;
          this.showDetail = true;
         
        },
        (err: any) => {
          this.errorText = "Please upload only valid photograph of male female or transgender."
          this.isUploading = false;
          this.showDetail = true;
          this.commanService.loaderSpinHide()
        }
      );
  
    } catch (err) {
      this.commanService.loaderSpinHide()
      console.error('base64 conversion/uploadAll error', err);
      this.error[0] = this.error[0] ?? 'Conversion failed';
      this.error[1] = this.error[1] ?? 'Conversion failed';
      this.isUploading = false;
      this.showDetail = false;
    }
  }

  private formatStatus(status: string | null): string {
    if (!status) return '—';
  
    const normalized = status.toLowerCase();
  
    if (normalized === 'matched') return 'Matched';
    if (normalized === 'not_matched') return 'No Match';
  
    return status; // fallback
  }

  get statusColor(): string {
    if (!this.statusText) return 'black';
  
    const s = this.statusText.toLowerCase();
  
    if (s === 'matched' || s === 'match') return 'green';
    if (s === 'not match' || s === 'not_matched') return 'red';
  
    return 'black';
  } 
  
  // allow final upload only when both files valid
  canUploadAll(): boolean {
    return !!(this.file[0] && this.file[1] && !this.error[0] && !this.error[1]);
  }

  private revokeObjectUrl(idx: number) {
    if (this.objectUrl[idx]) {
      try {
        URL.revokeObjectURL(this.objectUrl[idx] as string);
      } catch (e) {}
      this.objectUrl[idx] = null;
    }
  }

  private clearError(idx: number) {
    this.error[idx] = null;
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
  
  

  ngOnDestroy(): void {
    this.revokeObjectUrl(0);
    this.revokeObjectUrl(1);
  }



}

