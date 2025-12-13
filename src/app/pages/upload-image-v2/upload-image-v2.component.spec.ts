import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadImageV2Component } from './upload-image-v2.component';

describe('UploadImageV2Component', () => {
  let component: UploadImageV2Component;
  let fixture: ComponentFixture<UploadImageV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadImageV2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UploadImageV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
