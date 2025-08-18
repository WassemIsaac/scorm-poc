export interface ScoItem {
  id: string;
  title: string;
  launchUrl: string;
  schemaversion: '1.2' | '2004';
}

export interface CmiData {
  [key: string]: string;
}