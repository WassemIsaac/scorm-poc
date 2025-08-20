import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { UploadService } from './services/upload.service';
import { ScormPlayerComponent } from './scorm-player/scorm-player.component';
import { CoursesService } from './services/courses.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ScormPlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  errorMsg: string | null = null;
  successMsg: string | null = null;
  acceptedFileTypes: string = 'application/zip';
  maxFileSize: number = 6 * 1024 * 1024; // Default 6MB
  minFileSize: number = 0; // Default no minimum
  courses: any[] = [];
  selectedCourse: any;
  uploading: boolean = false;
  constructor(private uploadService: UploadService, private coursesService: CoursesService) { }

  ngOnInit(): void {
    this.getCourses();
  }

  getCourses(): void {
    this.coursesService.getCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: (err) => {
        console.error('Failed to load courses', err);
        this.errorMsg = 'Failed to load courses. Please try again.';
      }
    });
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
      this.errorMsg = 'Invalid file type. Please upload a zip file.';
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      if (this.maxFileSize / 1024 / 1024 > 999) {
        this.errorMsg = `File size exceeds the maximum limit of ${this.maxFileSize / 1024 / 1024 / 1024} GB.`;
      } else {
        this.errorMsg = `File size exceeds the maximum limit of ${this.maxFileSize / 1024 / 1024} MB.`;
      }
      return;
    }

    if (file.size < this.minFileSize) {
      this.errorMsg = `File size is below the minimum limit of ${this.minFileSize / 1024} KB.`;
      return;
    }

    this.uploading = true;
    this.uploadService.uploadFile(file)
    .pipe(
      finalize(() => {
        this.uploading = false;
      })
    )
    .subscribe({
      next: (url) => {
        this.successMsg = 'File uploaded successfully!';
        this.getCourses();
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.errorMsg = err?.error?.error || 'Upload failed. Please try again.';
      }
    });
  }
  
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.handleUploadFile(file)
  }

  selectCourse(course: any): void {
    this.selectedCourse = course;
  }


  deleteCourse(folder: string, index: number): void {
    this.coursesService.deleteCourse(folder).subscribe({
      next: () => {
        this.successMsg = 'Course deleted successfully';
        this.courses.splice(index, 1); // Remove the course from the list
        this.selectedCourse = null
      },
      error: (err) => {
        console.error('Failed to delete course', err);
        this.errorMsg = 'Failed to delete course. Please try again.';
      }
    });
  }
}
