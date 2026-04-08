import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface Client {
  id: string;
  code: string;
  user: {
    id: string;
    name: string;
    mobile: string;
    isActive: boolean;
  };
  years: {
    id: string;
    year: string;
    documentCount: number;
  }[];
  gstin?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  address?: string;
  stateCode?: string;
  city?: string;
  pincode?: string;
  location?: string;
  entityType?: string;
  businessName?: string;
  industrySector?: string;
  incorporationDate?: string;
  gstStatus?: string;
  financialYearEnd?: string;
  accountingMethod?: string;
  estimatedTurnover?: string;
  employeeCount?: string;
  identityProofUrl?: string;
  businessRegistrationUrl?: string;
  taxCardCopyUrl?: string;
  previousYearReturnUrl?: string;
  termsAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  name: string;
  mobile: string;
  code: string;
  email?: string;
  password?: string;
  location?: string;
  entityType?: string;
  businessName?: string;
  industrySector?: string;
  incorporationDate?: string;
  gstStatus?: string;
  financialYearEnd?: string;
  accountingMethod?: string;
  estimatedTurnover?: string;
  employeeCount?: string;
  address?: string;
  city?: string;
  pincode?: string;
  taxId?: string;
  pan?: string;
  gstin?: string;
  identityProofFile?: File | null;
  businessRegistrationFile?: File | null;
  taxCardCopyFile?: File | null;
  previousYearReturnFile?: File | null;
  termsAccepted?: boolean;
  isActive?: boolean;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {
  id?: string;
}

// - [x] Backend: Update ClientService to handle S3 uploads and signed URLs
// - [/] Frontend: Update ClientService to send FormData
// - [/] Frontend: Update ClientFormComponent to include files in payload
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/clients`;

  getClients(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Observable<PaginatedResponse<Client>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) params = params.set('search', search);
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortOrder) params = params.set('sortOrder', sortOrder);

    return this.http.get<PaginatedResponse<Client>>(this.baseUrl, { params });
  }

  getClient(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getClientByCode(code: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/code/${code}`);
  }

  createClient(data: CreateClientDto): Observable<any> {
    const formData = this.toFormData(data);
    return this.http.post(this.baseUrl, formData);
  }

  updateClient(id: string, data: UpdateClientDto): Observable<any> {
    const formData = this.toFormData(data);
    return this.http.put(`${this.baseUrl}/${id}`, formData);
  }

  deleteClient(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  toggleClientActive(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/toggle-active`, {});
  }

  getNextCode(): Observable<any> {
    return this.http.get(`${this.baseUrl}/next-code`);
  }

  private toFormData(data: any): FormData | any {
    const hasFiles = Object.values(data).some(v => v instanceof File);
    if (!hasFiles) return data;

    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== null && value !== undefined) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    return formData;
  }
}
