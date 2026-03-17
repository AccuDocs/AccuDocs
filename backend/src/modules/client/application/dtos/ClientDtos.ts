export interface CreateClientDTO {
  code: string;
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  stateCode?: string;
  city?: string;
  pincode?: string;
  creditLimit?: number;
  entityType?: 'individual' | 'proprietorship' | 'partnership' | 'pvt_ltd' | 'llp' | 'trust' | 'huf' | 'other';
  notes?: string;
}

export interface UpdateClientDTO {
  code?: string;
  name?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  stateCode?: string;
  city?: string;
  pincode?: string;
  creditLimit?: number;
  entityType?: any;
  notes?: string;
  isActive?: boolean;
  metadata?: any;
}

export interface ClientResponseDTO {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  gstin?: string | null;
  pan?: string | null;
  stateCode: string;
  mobile?: string | null;
  email?: string | null;
  metadata?: any;
  user: {
    id: string;
    name: string;
    mobile: string;
    isActive: boolean;
  };
  years?: { id: string, year: string, documentCount?: number }[];
  createdAt?: Date;
  updatedAt?: Date;
}
