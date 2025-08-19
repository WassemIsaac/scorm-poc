// --- src/app/core/services/scorm-api.service.ts ---
import { Inject, Injectable } from '@angular/core';
import { CmiData } from '../models/scorm.model';
import { HttpClient } from '@angular/common/http';
import { XApiService } from './xapi.service';

@Injectable({ providedIn: 'root' })
export class ScormApiService {
  private cmiData: CmiData = {};
  private initialized = false;
  private sequencingRequested = '';
  constructor(private httpClient: HttpClient, private xapi: XApiService) {}
  initialize(): string {
    this.initialized = true;
    console.log('[SCORM] API initialized');
     this.xapi.sendStatement(this.getCmiData(), {}, 'launched');
    return 'true';
  }

  getValue(element: string): string {
    if (!this.initialized) return 'false';
    if (element === 'adl.nav.request') {
      return this.sequencingRequested;
    }
    
    return this.cmiData[element] || '';
  }

  setValue(element: string, value: string): string {
    if (!this.initialized) return 'false';
    if (element === 'adl.nav.request') {
      this.sequencingRequested = value;
      alert('[SCORM] adl.nav.request is not supported. Value was:'+ value);
    } else {
      this.cmiData[element] = value;
    }
    console.log(`[SCORM] Set value for ${element}:`, value);
    return 'true';
  }

  commit(): string {
     // Simulate sending xAPI statement
    console.log('[SCORM] Commit value:', this.cmiData);
    this.xapi.sendStatement(this.cmiData, {}, 'set_value');
    return 'true';
  }

  terminate(): string {
    this.initialized = false;
    return 'true';
  }

  getCmiData(): CmiData {
    return this.cmiData;
  }

  exposeApi() {
    const apiObj = {
      LMSInitialize: () => this.initialize(),
      LMSGetValue: (key: string) => this.getValue(key),
      LMSSetValue: (key: string, value: string) => this.setValue(key, value),
      LMSCommit: () => this.commit(),
      LMSFinish: () => this.terminate(),
      LMSGetLastError: () => '0',
      LMSGetErrorString: (errorCode: string) => 'No error',
      LMSGetDiagnostic: (errorCode: string) => 'No diagnostic information',
    };

    const api2004 = {
      Initialize: () => this.initialize(),
      GetValue: (key: string) => this.getValue(key),
      SetValue: (key: string, value: string) => this.setValue(key, value),
      Commit: () => this.commit(),
      Terminate: () => this.terminate(),
      GetLastError: () => '0',
      GetErrorString: (errorCode: string) => 'No error',
      GetDiagnostic: (errorCode: string) => 'No diagnostic information',
    };

    const target: any = window;
      (target as any).API = apiObj;
      (target as any).API_1484_11 = api2004;

      console.log('[SCORM] API exposed');
  }
  
  getManifestFile(imsmanifestFilePath: string) {
    return this.httpClient.get(imsmanifestFilePath, { responseType: 'text' });
  }
}
