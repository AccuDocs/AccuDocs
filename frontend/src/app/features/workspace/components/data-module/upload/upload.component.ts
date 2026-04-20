import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowUpTraySolid, heroDocumentArrowDownSolid,
  heroCheckCircleSolid, heroExclamationCircleSolid,
  heroCloudArrowUpSolid
} from '@ng-icons/heroicons/solid';
import { DataService } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';
import { DocumentScannerComponent } from '../../../../document-scanner/components/document-scanner.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DocumentScannerComponent],
  providers: [provideIcons({ heroArrowUpTraySolid, heroDocumentArrowDownSolid, heroCheckCircleSolid, heroExclamationCircleSolid, heroCloudArrowUpSolid })],
  template: `
    <div class="space-y-6">
      <!-- Upload Type Toggle -->
      <div class="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1">
        @for (type of types; track type.key) {
          <button
            (click)="selectedType.set(type.key)"
            class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-center"
            [class]="selectedType() === type.key
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'"
          >{{ type.label }}</button>
        }
      </div>

      <!-- Drop Zone -->
      <div
        class="sa-card border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer"
        [ngClass]="isDragging() ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300'"
        (dragover)="onDragOver($event)"
        (dragleave)="isDragging.set(false)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input #fileInput type="file" accept=".xlsx,.xls,.csv" (change)="onFileSelected($event)" class="hidden" />
        <div class="flex flex-col items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ng-icon name="heroCloudArrowUpSolid" size="32"></ng-icon>
          </div>
          <div>
            <p class="text-lg font-bold text-slate-900">Upload {{ selectedType() | titlecase }} Data</p>
            <p class="text-sm text-slate-500 mt-1">Drag & drop your Excel file here, or click to browse</p>
            <p class="text-xs text-slate-400 mt-2">.xlsx, .xls, .csv — Max 10MB</p>
          </div>
        </div>
      </div>

      <!-- Upload Progress -->
      @if (isUploading()) {
        <div class="sa-card">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 animate-pulse">
              <ng-icon name="heroArrowUpTraySolid" size="20"></ng-icon>
            </div>
            <div class="flex-1">
              <p class="text-sm font-bold text-slate-900">Processing {{ fileName() }}...</p>
              <div class="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div class="bg-indigo-600 h-2 rounded-full transition-all duration-500" style="width: 60%"></div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Result -->
      @if (result()) {
        <div class="sa-card space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" [class]="result()!.failed === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
              <ng-icon [name]="result()!.failed === 0 ? 'heroCheckCircleSolid' : 'heroExclamationCircleSolid'" size="24"></ng-icon>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-900">Upload Complete</p>
              <p class="text-xs text-slate-500">{{ fileName() }}</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-emerald-700">{{ result()!.imported }}</p>
              <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Imported</p>
            </div>
            <div class="bg-rose-50 border border-rose-100 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-rose-700">{{ result()!.failed }}</p>
              <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1">Failed</p>
            </div>
          </div>
          @if (result()!.errors.length > 0) {
            <div class="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-2">Errors</p>
              <div class="space-y-1 max-h-40 overflow-y-auto">
                @for (err of result()!.errors; track $index) {
                  <p class="text-xs text-rose-700">Row {{ err.row }}: <span class="font-bold">{{ err.field }}</span> — {{ err.message }}</p>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Download Template -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <ng-icon name="heroDocumentArrowDownSolid" size="20"></ng-icon>
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold text-slate-900">Download Excel Templates</p>
            <p class="text-xs text-slate-500 mt-0.5">Use our predefined formats for uploading bulk data without errors</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-3">
          <button (click)="downloadTemplate('sales')" class="text-sm flex py-2 px-4 gap-2 items-center bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all focus:outline-none">
            <ng-icon name="heroDocumentArrowDownSolid" size="16"></ng-icon> Sales
          </button>
          <button (click)="downloadTemplate('purchases')" class="text-sm flex py-2 px-4 gap-2 items-center bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all focus:outline-none">
            <ng-icon name="heroDocumentArrowDownSolid" size="16"></ng-icon> Purchases
          </button>
          <button (click)="downloadTemplate('expenses')" class="text-sm flex py-2 px-4 gap-2 items-center bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-all focus:outline-none">
            <ng-icon name="heroDocumentArrowDownSolid" size="16"></ng-icon> Expenses
          </button>
        </div>
      </div>

      <app-document-scanner [clientId]="clientId" [embedded]="true" [presetType]="scannerDocumentType"></app-document-scanner>
    </div>
  `,
  styles: [`:host{display:block}.sa-card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:all .2s ease}.sa-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);transform:translateY(-1px)}`]
})
export class UploadComponent {
  @Input() clientId = '';

  private dataService = inject(DataService);
  private toast = inject(ToastService);

  selectedType = signal<'sales' | 'purchases' | 'expenses'>('sales');
  isDragging = signal(false);
  isUploading = signal(false);
  fileName = signal('');
  result = signal<{ imported: number; failed: number; errors: any[] } | null>(null);

  types = [
    { key: 'sales' as const, label: 'Sales' },
    { key: 'purchases' as const, label: 'Purchases' },
    { key: 'expenses' as const, label: 'Expenses' },
  ];

  get scannerDocumentType(): 'sale' | 'purchase' | 'expense' {
    switch (this.selectedType()) {
      case 'sales':
        return 'sale';
      case 'purchases':
        return 'purchase';
      case 'expenses':
      default:
        return 'expense';
    }
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadFile(file);
  }

  uploadFile(file: File) {
    this.fileName.set(file.name);
    this.isUploading.set(true);
    this.result.set(null);

    let obs;
    switch (this.selectedType()) {
      case 'sales': obs = this.dataService.uploadSales(this.clientId, file); break;
      case 'purchases': obs = this.dataService.uploadPurchases(this.clientId, file); break;
      case 'expenses': obs = this.dataService.uploadExpenses(this.clientId, file); break;
    }

    obs.subscribe({
      next: (res: any) => {
        this.isUploading.set(false);
        if (res.success) {
          this.result.set(res.data);
          this.toast.success(`Imported ${res.data.imported} rows`);
        }
      },
      error: (err) => { this.isUploading.set(false); this.toast.error('Upload failed', err.message); }
    });
  }

  async downloadTemplate(typeOverride?: 'sales' | 'purchases' | 'expenses') {
    const ExcelJS = await import('exceljs');
    const { saveAs } = await import('file-saver');

    const workbook = new ExcelJS.Workbook();
    const type = typeOverride || this.selectedType();
    const sheet = workbook.addWorksheet(`${type.charAt(0).toUpperCase() + type.slice(1)} Template`);

    let columns: any[] = [];
    let sampleData: any[] = [];

    switch (type) {
      case 'sales':
        columns = [
          { header: 'Invoice No', key: 'invoiceNo', width: 15 },
          { header: 'Invoice Date', key: 'invoiceDate', width: 15 },
          { header: 'Customer Name', key: 'customerName', width: 25 },
          { header: 'GSTIN', key: 'gstin', width: 20 },
          { header: 'Invoice Type', key: 'invoiceType', width: 15 },
          { header: 'Place of Supply', key: 'placeOfSupply', width: 20 },
          { header: 'Description', key: 'description', width: 20 },
          { header: 'HSN SAC', key: 'hsnSac', width: 15 },
          { header: 'Quantity', key: 'quantity', width: 10 },
          { header: 'Rate', key: 'rate', width: 10 },
          { header: 'Base Amount', key: 'baseAmount', width: 15 },
          { header: 'GST Rate', key: 'gstRate', width: 10 },
          { header: 'CGST Amount', key: 'cgst', width: 15 },
          { header: 'SGST Amount', key: 'sgst', width: 15 },
          { header: 'IGST Amount', key: 'igst', width: 15 },
          { header: 'Cess Amount', key: 'cess', width: 15 },
          { header: 'Is Nil Rated', key: 'isNilRated', width: 15 },
          { header: 'Is Advance', key: 'isAdvance', width: 15 },
        ];
        sampleData = [
          { invoiceNo: 'INV-001', invoiceDate: '15-04-2026', customerName: 'Acme Corp', gstin: '27AABCU9603R1ZM', invoiceType: 'B2B', placeOfSupply: '27-Maharashtra', description: 'Consulting', hsnSac: '9983', quantity: 1, rate: 10000, baseAmount: 10000, gstRate: 18, cgst: 900, sgst: 900, igst: 0, cess: 0, isNilRated: 'No', isAdvance: 'No' },
          { invoiceNo: 'INV-002', invoiceDate: '20-04-2026', customerName: 'Global Tech', gstin: '29ABCDE1234F1Z5', invoiceType: 'B2B', placeOfSupply: '29-Karnataka', description: 'Software License', hsnSac: '9973', quantity: 2, rate: 50000, baseAmount: 100000, gstRate: 18, cgst: 0, sgst: 0, igst: 18000, cess: 0, isNilRated: 'No', isAdvance: 'No' }
        ];
        break;

      case 'purchases':
        columns = [
          { header: 'Bill No', key: 'billNo', width: 15 },
          { header: 'Bill Date', key: 'billDate', width: 15 },
          { header: 'Vendor Name', key: 'vendorName', width: 25 },
          { header: 'GSTIN', key: 'gstin', width: 20 },
          { header: 'Purchase Type', key: 'purchaseType', width: 15 },
          { header: 'Description', key: 'description', width: 20 },
          { header: 'HSN SAC', key: 'hsnSac', width: 15 },
          { header: 'Quantity', key: 'quantity', width: 10 },
          { header: 'Rate', key: 'rate', width: 10 },
          { header: 'Base Amount', key: 'baseAmount', width: 15 },
          { header: 'GST Rate', key: 'gstRate', width: 10 },
          { header: 'CGST Amount', key: 'cgst', width: 15 },
          { header: 'SGST Amount', key: 'sgst', width: 15 },
          { header: 'IGST Amount', key: 'igst', width: 15 },
          { header: 'ITC Eligible', key: 'itcEligible', width: 15 },
          { header: 'RCM Applicable', key: 'rcmApplicable', width: 15 },
          { header: 'Is Capital Goods', key: 'isCapitalGoods', width: 15 },
        ];
        sampleData = [
          { billNo: 'BILL-001', billDate: '10-04-2026', vendorName: 'Office Supplies Inc', gstin: '27XYZABC1234F2Z1', purchaseType: 'local', description: 'Stationery', hsnSac: '4820', quantity: 10, rate: 500, baseAmount: 5000, gstRate: 18, cgst: 450, sgst: 450, igst: 0, itcEligible: 'Yes', rcmApplicable: 'No', isCapitalGoods: 'No' },
          { billNo: 'BILL-002', billDate: '18-04-2026', vendorName: 'Tech Solutions Ltd', gstin: '27ABCDE5678G1Z2', purchaseType: 'interstate', description: 'Server Hardware', hsnSac: '8471', quantity: 1, rate: 75000, baseAmount: 75000, gstRate: 18, cgst: 0, sgst: 0, igst: 13500, itcEligible: 'Yes', rcmApplicable: 'No', isCapitalGoods: 'Yes' }
        ];
        break;

      case 'expenses':
        columns = [
          { header: 'Expense Date', key: 'expenseDate', width: 15 },
          { header: 'Category', key: 'category', width: 15 },
          { header: 'Description', key: 'description', width: 25 },
          { header: 'Vendor Name', key: 'vendorName', width: 20 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Payment Mode', key: 'paymentMode', width: 15 },
          { header: 'Reference No', key: 'referenceNo', width: 15 },
          { header: 'GST Applicable', key: 'gstApplicable', width: 15 },
          { header: 'GST Rate', key: 'gstRate', width: 10 },
          { header: 'GST Amount', key: 'gstAmount', width: 15 },
          { header: 'ITC Allowed', key: 'itcAllowed', width: 15 },
          { header: 'ITC Blocked Reason', key: 'itcBlockedReason', width: 20 },
        ];
        sampleData = [
          { expenseDate: '01-04-2026', category: 'travel', description: 'Flight to Delhi', vendorName: 'Air India', amount: 8500, paymentMode: 'credit_card', referenceNo: 'TXN-8821', gstApplicable: 'Yes', gstRate: 5, gstAmount: 425, itcAllowed: 'Yes', itcBlockedReason: '' },
          { expenseDate: '05-04-2026', category: 'office', description: 'Rent April 2026', vendorName: 'ABC Realty', amount: 25000, paymentMode: 'bank_transfer', referenceNo: 'NEFT-4421', gstApplicable: 'Yes', gstRate: 18, gstAmount: 4500, itcAllowed: 'No', itcBlockedReason: 'Blocked under Section 17(5)' }
        ];
        break;
    }

    sheet.columns = columns;

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 28;

    // Add thin border to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Add sample data with light styling
    sampleData.forEach(data => {
      const row = sheet.addRow(data);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Add instructions sheet
    const instrSheet = workbook.addWorksheet('Instructions');
    instrSheet.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Required', key: 'required', width: 10 },
      { header: 'Format', key: 'format', width: 35 },
      { header: 'Example', key: 'example', width: 30 },
    ];
    instrSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    instrSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

    const instructions: Record<string, any[]> = {
      sales: [
        { field: 'Invoice No', required: 'Yes', format: 'Text', example: 'INV-001' },
        { field: 'Invoice Date', required: 'Yes', format: 'DD-MM-YYYY', example: '15-04-2026' },
        { field: 'Customer Name', required: 'Yes', format: 'Text', example: 'Acme Corp' },
        { field: 'Base Amount', required: 'Yes', format: 'Number (>0)', example: '10000' },
        { field: 'GST Rate', required: 'No', format: '0, 5, 12, 18, 28', example: '18' },
        { field: 'GSTIN', required: 'No', format: '15-char GST No', example: '27AABCU9603R1ZM' },
        { field: 'Invoice Type', required: 'No', format: 'B2B / B2C / Export / SEZ', example: 'B2B' },
        { field: 'Place of Supply', required: 'No', format: 'StateCode-Name', example: '27-Maharashtra' },
        { field: 'Is Nil Rated', required: 'No', format: 'Yes / No', example: 'No' },
        { field: 'Is Advance', required: 'No', format: 'Yes / No', example: 'No' },
      ],
      purchases: [
        { field: 'Bill No', required: 'Yes', format: 'Text', example: 'BILL-001' },
        { field: 'Bill Date', required: 'Yes', format: 'DD-MM-YYYY', example: '10-04-2026' },
        { field: 'Vendor Name', required: 'Yes', format: 'Text', example: 'Office Supplies Inc' },
        { field: 'Base Amount', required: 'Yes', format: 'Number (>0)', example: '5000' },
        { field: 'GST Rate', required: 'No', format: '0, 5, 12, 18, 28', example: '18' },
        { field: 'GSTIN', required: 'No', format: '15-char GST No', example: '27XYZABC1234F2Z1' },
        { field: 'Purchase Type', required: 'No', format: 'local / interstate / import', example: 'local' },
        { field: 'ITC Eligible', required: 'No', format: 'Yes / No', example: 'Yes' },
        { field: 'RCM Applicable', required: 'No', format: 'Yes / No', example: 'No' },
        { field: 'Is Capital Goods', required: 'No', format: 'Yes / No', example: 'No' },
      ],
      expenses: [
        { field: 'Expense Date', required: 'Yes', format: 'DD-MM-YYYY', example: '01-04-2026' },
        { field: 'Description', required: 'Yes', format: 'Text', example: 'Flight to Delhi' },
        { field: 'Amount', required: 'Yes', format: 'Number (>0)', example: '8500' },
        { field: 'Category', required: 'No', format: 'travel / office / salary / rent / other', example: 'travel' },
        { field: 'Payment Mode', required: 'No', format: 'cash / bank_transfer / credit_card / upi', example: 'credit_card' },
        { field: 'GST Applicable', required: 'No', format: 'Yes / No', example: 'Yes' },
        { field: 'GST Rate', required: 'No', format: '0, 5, 12, 18, 28', example: '5' },
        { field: 'ITC Allowed', required: 'No', format: 'Yes / No', example: 'Yes' },
      ],
    };

    (instructions[type] || []).forEach((row: any) => instrSheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `AccuDocs_${type}_template.xlsx`);
  }
}
