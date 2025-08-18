import { Injectable } from '@angular/core';
import { ScoItem } from '../models/scorm.model';
import { CmiData } from '../models/scorm.model';

@Injectable({ providedIn: 'root' })
export class XApiService {
  sendStatement(cmi: CmiData, sco: ScoItem| any, verb: string) {
    // This logs a simulated xAPI statement for demo purposes.
    console.log('[xAPI]', { 
      actor: {
        name: 'Learner',
        mbox: 'mailto:learner@example.com',
      },
      verb: { id: `http://adlnet.gov/expapi/verbs/${verb}`, display: { 'en-US': verb } },
      object: {
        id: sco?.id,
        definition: {
          name: { 'en-US': sco?.title },
          description: { 'en-US': 'SCORM-based content' },
        },
      },
      result: {
        extensions: { ...cmi },
      },
    });
  }
}
