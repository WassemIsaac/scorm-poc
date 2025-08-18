import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UploadService } from './services/upload.service';
import { Observable } from 'rxjs';
import { ScormPlayerComponent } from './scorm-player/scorm-player.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ScormPlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  error: string | null = null;
  acceptedFileTypes: string = 'application/zip';
  maxFileSize: number = 6 * 1024 * 1024; // Default 6MB
  minFileSize: number = 0; // Default no minimum
  courses$: Observable<any> = new Observable();
  selectedCourse: any;
  constructor(private uploadService: UploadService) { }

  ngOnInit(): void {
    this.courses$ = this.uploadService.getCourses();
  }

  handleUploadFile(file: File): void {
    const acceptedTypes = this.acceptedFileTypes.split(',').map(type => type.trim());

    // Validate file type
    const isValidType = acceptedTypes.some(type => {
      // Allow wildcard matches (e.g., image/*)
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      // Exact match
      return file.type === type || (type === 'application/zip' && file.type === 'application/x-zip-compressed');
    });

    if (!isValidType) {
      this.error = 'Invalid file type. Please upload a zip file.';
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      if (this.maxFileSize / 1024 / 1024 > 999) {
        this.error = `File size exceeds the maximum limit of ${this.maxFileSize / 1024 / 1024 / 1024} GB.`;
      } else {
        this.error = `File size exceeds the maximum limit of ${this.maxFileSize / 1024 / 1024} MB.`;
      }
      return;
    }

    if (file.size < this.minFileSize) {
      this.error = `File size is below the minimum limit of ${this.minFileSize / 1024} KB.`;
      return;
    }

    this.uploadService.uploadFile(file).subscribe({
      next: (url) => {
        console.log('File uploaded successfully:', url);
        this.courses$ = this.uploadService.getCourses();
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.error = 'Upload failed. Please try again.';
      }
    });
  }

  // Upload
  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.handleUploadFile(file)
  }



  selectCourse(course: any): void {
    // Logic to select the course and possibly load it
    this.selectedCourse = course;
    console.log('Selected course:', this.selectedCourse);
  }
}
