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
}
