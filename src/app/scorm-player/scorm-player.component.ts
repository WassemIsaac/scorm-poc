import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ScormApiService } from '../services/scorm-api.service';
import { Course, ScoItem } from '../models/scorm.model';
import { SafeUrlPipe } from '../services/safe-url.pipe';
import { CommonModule } from '@angular/common';
import { CoursesService } from '../services/courses.service';

@Component({
  selector: 'app-scorm-player',
  templateUrl: './scorm-player.component.html',
  styleUrls: ['./scorm-player.component.scss'],
  imports:  [CommonModule , SafeUrlPipe]
})
export class ScormPlayerComponent implements OnInit , OnChanges{
  scos: ScoItem[] = [];
  @Input() packageName: {id: string, name: string, path: string};
  currentSco?: ScoItem;
  sequencingWarning = false;
  course: Course | null = null;

  constructor(private scormService: ScormApiService, private coursesService: CoursesService) {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    this.getCourseById(this.packageName?.id);
  }

  getCourseById(id: string): void {
    this.coursesService.getCourseById(id).subscribe({
      next: (course: Course) => {
        this.course = course;

        console.log('Parsed SCOs:', this.course.scos);
        this.scormService.exposeApi();

        // Launch the first SCO if it exists
        if (this.course.scos.length > 0) {
          this.launch(this.course.scos[0]);
        } else {
          console.warn('No launchable items (SCOs) found in the manifest.');
        }

      },
      error: (err) => {
        console.error(`Error fetching course with ID ${id}:`, err);
      }
    });
  }

  launch(sco: ScoItem): void {
    this.currentSco = sco;
  }
}