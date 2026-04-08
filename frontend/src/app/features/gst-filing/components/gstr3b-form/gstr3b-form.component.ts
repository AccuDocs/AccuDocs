import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { GstService } from '../../../../core/services/gst.service';

@Component({
  selector: 'app-gstr3b-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="px-4 py-6 w-full max-w-9xl mx-auto animate-in slide-in-from-right duration-300">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl md:text-3xl text-slate-800 font-bold">GSTR-3B Details</h1>
        <button (click)="back.emit()" class="btn border-slate-200 hover:border-slate-300 text-slate-600">
          <span class="mr-2">←</span> Back to Summary
        </button>
      </div>

      <div class="bg-white p-5 shadow-lg rounded-sm border border-slate-200 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label class="block text-sm font-medium mb-1">Period Month</label>
            <select class="form-select w-full" [(ngModel)]="periodMonth" [disabled]="returnId !== 'new'">
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Period Year</label>
            <input class="form-input w-full" type="number" [(ngModel)]="periodYear" [disabled]="returnId !== 'new'"/>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Financial Year</label>
            <input class="form-input w-full" type="text" [(ngModel)]="financialYear" [disabled]="returnId !== 'new'"/>
          </div>
          <div>
            <button class="btn bg-emerald-500 hover:bg-emerald-600 text-white w-full" (click)="autoFetch()" [disabled]="returnId !== 'new'">
              Auto-Fetch & Calculate
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="summaryData" class="space-y-6">
        <!-- Outward Supplies -->
        <div class="bg-white p-5 shadow-lg rounded-sm border border-slate-200">
          <h2 class="text-lg font-semibold text-slate-800 mb-4">3.1 Details of Outward Supplies</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div class="text-sm text-slate-500">Taxable Value</div>
              <div class="text-xl font-bold text-slate-800">₹{{ summaryData.sup_details?.osup_det?.txval || 0 }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">IGST</div>
              <div class="text-xl font-bold text-slate-800">₹{{ summaryData.sup_details?.osup_det?.iamt || 0 }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">CGST</div>
              <div class="text-xl font-bold text-slate-800">₹{{ summaryData.sup_details?.osup_det?.camt || 0 }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">SGST</div>
              <div class="text-xl font-bold text-slate-800">₹{{ summaryData.sup_details?.osup_det?.samt || 0 }}</div>
            </div>
          </div>
        </div>

        <!-- Eligible ITC -->
        <div class="bg-white p-5 shadow-lg rounded-sm border border-slate-200">
          <h2 class="text-lg font-semibold text-slate-800 mb-4">4. Eligible ITC</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div class="text-sm text-slate-500">IGST</div>
              <div class="text-xl font-bold text-emerald-600">₹{{ getItc('iamt') }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">CGST</div>
              <div class="text-xl font-bold text-emerald-600">₹{{ getItc('camt') }}</div>
            </div>
            <div>
              <div class="text-sm text-slate-500">SGST</div>
              <div class="text-xl font-bold text-emerald-600">₹{{ getItc('samt') }}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button class="btn border-slate-200 hover:border-slate-300 text-slate-600" (click)="back.emit()">Cancel</button>
          <button *ngIf="returnId !== 'new'" class="btn bg-indigo-500 hover:bg-indigo-600 text-white" (click)="markAsFiled()">Submit & File</button>
        </div>
      </div>
    </div>
  `
})
export class Gstr3bFormComponent implements OnInit {
  @Input() returnId: string = 'new';
  @Input() periodMonth: number = 4;
  @Input() periodYear: number = 2026;
  @Input() financialYear: string = '2026-27';
  @Input() clientId: string = '';
  @Input() organizationId: string = '';

  @Output() back = new EventEmitter<void>();

  summaryData: any = null;

  constructor(
    private route: ActivatedRoute, 
    private gstService: GstService,
    private router: Router
  ) {}

  ngOnInit() {
    // If used as standalone route
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.returnId = routeId;
    }

    if (this.returnId !== 'new') {
      this.loadReturn(this.returnId);
    }
  }

  loadReturn(id: string) {
    this.gstService.getReturnById(id).subscribe((res: any) => {
      const data = res.data;
      this.periodMonth = data.periodMonth;
      this.periodYear = data.periodYear;
      this.financialYear = data.financialYear;
      this.summaryData = data.jsonData;
    });
  }

  autoFetch() {
    const payload = {
      clientId: this.clientId,
      organizationId: this.organizationId,
      returnType: 'GSTR-3B',
      periodMonth: Number(this.periodMonth),
      periodYear: Number(this.periodYear),
      financialYear: this.financialYear
    };

    this.gstService.generateDraft(payload).subscribe((res: any) => {
      this.returnId = res.data.id;
      this.summaryData = res.data.jsonData;
    });
  }

  getItc(type: string) {
    if (this.summaryData?.itc_elg?.itc_avl && this.summaryData.itc_elg.itc_avl.length > 0) {
      return this.summaryData.itc_elg.itc_avl[0][type] || 0;
    }
    return 0;
  }

  markAsFiled() {
    this.gstService.updateReturn(this.returnId, { status: 'filed' }).subscribe(() => {
      this.back.emit();
    });
  }
}
