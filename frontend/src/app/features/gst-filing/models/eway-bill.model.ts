export interface EWayBillData {
  id: string;
  invoiceId: string;
  ewayBillNo: string | null;
  generatedAt: string | null;
  validUpto: string | null;
  transporterId: string | null;
  vehicleNo: string | null;
  distanceKm: number;
  transportMode: 'road' | 'rail' | 'air' | 'ship';
  status: 'generated' | 'cancelled' | 'expired';
  errorMessage: string | null;
  createdAt: string;
}

export interface GenerateEWayBillDto {
  invoiceId: string;
  transporterId?: string;
  vehicleNo?: string;
  distanceKm: number;
  transportMode: 'road' | 'rail' | 'air' | 'ship';
}
