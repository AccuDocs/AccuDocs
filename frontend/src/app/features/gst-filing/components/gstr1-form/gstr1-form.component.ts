import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { GstService } from '../../../../core/services/gst.service';

@Component({
  selector: 'app-gstr1-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="px-4 py-6 w-full max-w-9xl mx-auto animate-in slide-in-from-right duration-300">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl md:text-3xl text-slate-800 font-bold">GSTR-1 Details</h1>
        <button (click)="back.emit()" class="btn border-slate-200 hover:border-slate-300 text-slate-600">
          <span class="mr-2">←</span> Back to Summary
        </button>
      </div>

      <div class="bg-white p-5 shadow-lg rounded-sm border border-slate-200 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label class="block text-sm font-medium mb-1" for="month">Period Month</label>
            <select id="month" class="form-select w-full" [(ngModel)]="periodMonth" [disabled]="returnId !== 'new'">
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <!-- Add remaining months as needed -->
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="year">Period Year</label>
            <input id="year" class="form-input w-full" type="number" [(ngModel)]="periodYear" [disabled]="returnId !== 'new'"/>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="fy">Financial Year</label>
            <input id="fy" class="form-input w-full" type="text" [(ngModel)]="financialYear" [disabled]="returnId !== 'new'"/>
          </div>
          <div>
            <button class="btn bg-indigo-500 hover:bg-indigo-600 text-white w-full" (click)="autoFetch()" [disabled]="returnId !== 'new'">
              Auto-Fetch from Sales
            </button>
          </div>
        </div>
      </div>

      <!-- JSON Data Preview/Editor -->
      <div *ngIf="b2bEntries.length > 0" class="bg-white p-5 shadow-lg rounded-sm border border-slate-200">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">B2B Invoices</h2>
        <div class="overflow-x-auto">
          <table class="table-auto w-full">
            <thead class="text-xs font-semibold uppercase text-slate-500 bg-slate-50 border-t border-b border-slate-200">
              <tr>
                <th class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div class="font-semibold text-left">GSTIN</div></th>
                <th class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div class="font-semibold text-left">Inv No</div></th>
                <th class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div class="font-semibold text-left">Inv Date</div></th>
                <th class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div class="font-semibold text-right">Value</div></th>
                <th class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap"><div class="font-semibold text-right">Taxable</div></th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-slate-200">
              <ng-container *ngFor="let b2b of b2bEntries">
                <tr *ngFor="let inv of b2b.inv">
                  <td class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <input type="text" class="form-input w-full text-sm" [(ngModel)]="b2b.ctin" />
                  </td>
                  <td class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <input type="text" class="form-input w-full text-sm" [(ngModel)]="inv.inum" />
                  </td>
                  <td class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
                    <input type="text" class="form-input w-full text-sm" [(ngModel)]="inv.idt" />
                  </td>
                  <td class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                    <input type="number" class="form-input w-24 text-sm text-right" [(ngModel)]="inv.val" />
                  </td>
                  <td class="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap text-right">
                    <input type="number" class="form-input w-24 text-sm text-right" [(ngModel)]="inv.itms[0].txval" />
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button class="btn border-slate-200 hover:border-slate-300 text-slate-600" (click)="back.emit()">Cancel</button>
          <button class="btn bg-indigo-500 hover:bg-indigo-600 text-white" (click)="saveDraft()">Save Draft</button>
          <button *ngIf="returnId !== 'new'" class="btn bg-emerald-500 hover:bg-emerald-600 text-white" (click)="markAsFiled()">Submit & File</button>
        </div>
      </div>
    </div>
  `
})
export class Gstr1FormComponent implements OnInit {
  @Input() returnId: string = 'new';
  @Input() periodMonth: number = 4;
  @Input() periodYear: number = 2026;
  @Input() financialYear: string = '2026-27';
  @Input() clientId: string = '';
  @Input() organizationId: string = '';

  @Output() back = new EventEmitter<void>();

  b2bEntries: any[] = [];
  rawJson: any = {};

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
      this.rawJson = data.jsonData;
      this.b2bEntries = this.rawJson.b2b || [];
    });
  }

  autoFetch() {
    const payload = {
      clientId: this.clientId,
      organizationId: this.organizationId,
      returnType: 'GSTR-1',
      periodMonth: Number(this.periodMonth),
      periodYear: Number(this.periodYear),
      financialYear: this.financialYear
    };

    this.gstService.generateDraft(payload).subscribe((res: any) => {
      this.returnId = res.data.id;
      this.rawJson = res.data.jsonData;
      this.b2bEntries = this.rawJson.b2b || [];
    });
  }

  saveDraft() {
    this.rawJson.b2b = this.b2bEntries;
    this.gstService.updateReturn(this.returnId, { jsonData: this.rawJson }).subscribe(() => {
      alert('Draft saved successfully');
    });
  }

  markAsFiled() {
    this.gstService.updateReturn(this.returnId, { status: 'filed' }).subscribe(() => {
      this.back.emit();
    });
  }
}
