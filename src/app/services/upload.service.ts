import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private httpClient: HttpClient) {}

  uploadFile(file: File) {
   const formData = new FormData();
    formData.append('file', file);
    console.log('Uploading file:', file.name);
    return this.httpClient.post<{ path: string }>('/api/upload', formData);
  }


  getCourses() {
  //     return of([
  //     {
  //         "name": "ContentPackagingOneFilePerSCO_SCORM12",
  //         "path": "/uploads/1755528570914-ContentPackagingOneFilePerSCO_SCORM12"
  //     },
  //     {
  //         "name": "SequencingForcedSequential_SCORM20043rdEdition",
  //         "path": "/uploads/1755528699977-SequencingForcedSequential_SCORM20043rdEdition"
  //     }
  // ])
    return this.httpClient.get<{ name: string; path: string }[]>('/api/courses');
  }
}
