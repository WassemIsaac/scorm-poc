import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ScormApiService } from '../services/scorm-api.service';
import { ScoItem } from '../models/scorm.model';
import { SafeUrlPipe } from '../services/safe-url.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scorm-player',
  templateUrl: './scorm-player.component.html',
  imports:  [CommonModule , SafeUrlPipe]
})
export class ScormPlayerComponent implements OnInit , OnChanges{
  scos: ScoItem[] = [];
  @Input() packageName: {name: string, path: string};
  currentSco?: ScoItem;
  sequencingWarning = false;

  constructor(private scormService: ScormApiService) {}

  ngOnInit(): void {
   
  }
  ngOnChanges(changes: SimpleChanges): void {
     this.parseimsManifest(`${this.packageName?.path}/imsmanifest.xml`);
  }

  /**
   * This funtion is to be made from the backend side, but for now we will use the scormService to fetch the manifest file.
   * 
   * Parses the imsmanifest.xml file to extract SCO items and their launch URLs.
   * @param manifestPath - The path to the imsmanifest.xml file.
   */
  parseimsManifest(manifestPath: string) {
    this.scormService.getManifestFile(manifestPath).subscribe({
      next: (manifestXmlString: string) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(manifestXmlString, 'application/xml');

        // 2. Create a Map of all resources for easy lookup
        const resourcesMap = new Map();
        xmlDoc.querySelectorAll('resource').forEach(res => {
          const identifier = res.getAttribute('identifier');
          if (identifier) {
            resourcesMap.set(identifier, {
              href: res.getAttribute('href') || '',
              scormType: res.getAttribute('adlcp:scormType') || res.getAttribute('adlcp:scormtype')
            });
          }
        });

        // 3. Get the default organization and find all launchable items
        const defaultOrgIdentifier = xmlDoc.querySelector('organizations')?.getAttribute('default');
        const organization = xmlDoc.querySelector(`organization[identifier="${defaultOrgIdentifier}"]`);

        const hasSequencing = organization?.querySelector('imsss\\:sequencing, sequencing') !== null;
        setTimeout(() => {this.sequencingWarning = hasSequencing;});

        if (!organization) {
          console.error('Default organization not found in manifest.');
          return;
        }

        // 4. Build the SCO list from the organization's items
        this.scos = Array.from(organization.querySelectorAll('item[identifierref]'))
          .map((item) => {
            const itemIdentifier = item.getAttribute('identifier');
            const title = item.querySelector('title')?.textContent || 'Untitled';
            const identifierRef = item.getAttribute('identifierref');
            const resource = resourcesMap.get(identifierRef);

            if (!resource) return null;

            const parameters = item.getAttribute('parameters') || '';
            const launchUrl = this.packageName?.path + '/' + resource.href + parameters;

            return {
              id: itemIdentifier || '',
              title: title,
              launchUrl: launchUrl
            };
          })
          .filter(sco => sco !== null) as ScoItem[]; // Remove any nulls if a resource wasn't found

        console.log('Parsed SCOs:', this.scos);
        this.scormService.exposeApi();

        // Launch the first SCO if it exists
        if (this.scos.length > 0) {
          this.launch(this.scos[0]);
        } else {
          console.warn('No launchable items (SCOs) found in the manifest.');
        }
      },
      error: (err: any) => {
        console.error(`Error fetching manifest file at ${manifestPath}:`, err);
      }
    });
  }

  launch(sco: ScoItem): void {
    this.currentSco = sco;
  }
}