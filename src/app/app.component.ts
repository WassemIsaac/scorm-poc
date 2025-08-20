import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UploadService } from './services/upload.service';
import { Observable } from 'rxjs';
import { ScormPlayerComponent } from './scorm-player/scorm-player.component';
import { CoursesService } from './services/courses.service';

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
  courses: any[] = [];
  selectedCourse: any;
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
        this.error = 'Failed to load courses. Please try again.';
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
        this.getCourses();
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.error = 'Upload failed. Please try again.';
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
        console.log('Course deleted successfully');
        this.courses.splice(index, 1); // Remove the course from the list
        this.selectedCourse = null
      },
      error: (err) => {
        console.error('Failed to delete course', err);
        this.error = 'Failed to delete course. Please try again.';
      }
    });
  }
}
