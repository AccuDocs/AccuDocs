export interface ServiceTemplate {
  id: string;
  name: string;
  description?: string;
  sacCode: string;
  defaultRate: number;
  defaultGstRate: number;
  sortOrder: number;
}
