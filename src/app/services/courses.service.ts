// courses.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from '../models/scorm.model';

@Injectable({ providedIn: 'root' })
export class CoursesService {
  constructor(private httpClient: HttpClient) { }

  getCourses() {
    return this.httpClient.get<{ id: string, name: string; path: string }[]>('/api/courses');
  }

  getCourseById(id: string): Observable<Course> {
    return this.httpClient.get<Course>(`/api/courses/${id}`);
  }
}