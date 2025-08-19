export interface ScoItem {
  id: string;
  title: string;
  launchUrl: string
}

export interface CmiData {
  [key: string]: string;
}

export interface Course {
  id: string;
  name: string;
  scos: ScoItem[];
  scosCount: number;
  hasSequencing: boolean;
}