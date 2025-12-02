import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompareImageComponent } from './compare-image.component';

describe('CompareImageComponent', () => {
  let component: CompareImageComponent;
  let fixture: ComponentFixture<CompareImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompareImageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CompareImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
