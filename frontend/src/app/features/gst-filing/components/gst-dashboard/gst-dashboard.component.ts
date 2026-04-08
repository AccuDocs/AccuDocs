import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { GstService } from '../../../../core/services/gst.service';

@Component({
  selector: 'app-gst-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div class="sm:flex sm:justify-between sm:items-center mb-8">
        <div class="mb-4 sm:mb-0">
          <h1 class="text-2xl md:text-3xl text-slate-800 font-bold">GST Filing Dashboard ✨</h1>
        </div>
        <div class="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          <button (click)="createReturn('GSTR-1')" class="btn bg-indigo-500 hover:bg-indigo-600 text-white">
            <svg class="w-4 h-4 fill-current opacity-50 shrink-0" viewBox="0 0 16 16">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span class="hidden xs:block ml-2">New GSTR-1</span>
          </button>
          <button (click)="createReturn('GSTR-3B')" class="btn bg-emerald-500 hover:bg-emerald-600 text-white">
            <span class="hidden xs:block ml-2">New GSTR-3B</span>
          </button>
        </div>
      </div>

      <!-- Returns Table -->
      <div class="bg-white shadow-lg rounded-sm border border-slate-200">
        <header class="px-5 py-4">
          <h2 class="font-semibold text-slate-800">Assigned Returns <span class="text-slate-400 font-medium">{{ returns.length }}</span></h2>
        </header>
        <div class="p-3">
          <div class="overflow-x-auto">
            <table class="table-auto w-full">
              <thead class="text-xs uppercase text-slate-400 bg-slate-50 rounded-sm">
                <tr>
                  <th class="p-2"><div class="font-semibold text-left">Type</div></th>
                  <th class="p-2"><div class="font-semibold text-left">Period</div></th>
                  <th class="p-2"><div class="font-semibold text-center">Status</div></th>
                  <th class="p-2"><div class="font-semibold text-center">Actions</div></th>
                </tr>
              </thead>
              <tbody class="text-sm font-medium divide-y divide-slate-100">
                <tr *ngFor="let ret of returns">
                  <td class="p-2">
                    <div class="flex items-center">
                      <div class="text-slate-800">{{ ret.returnType }}</div>
                    </div>
                  </td>
                  <td class="p-2">
                    <div class="text-left">{{ getMonthName(ret.periodMonth) }} {{ ret.periodYear }}</div>
                  </td>
                  <td class="p-2">
                    <div class="text-center">
                      <div class="text-xs inline-flex font-medium rounded-full text-center px-2.5 py-1"
                           [ngClass]="{
                             'bg-amber-100 text-amber-600': ret.status === 'draft',
                             'bg-emerald-100 text-emerald-600': ret.status === 'filed'
                           }">
                        {{ ret.status | uppercase }}
                      </div>
                    </div>
                  </td>
                  <td class="p-2 text-center flex justify-center space-x-2">
                    <button class="text-indigo-500 hover:text-indigo-600" (click)="editReturn(ret)">Edit</button>
                    <button *ngIf="ret.status === 'filed'" class="text-emerald-500" (click)="downloadJson(ret.id)">Re-download JSON</button>
                  </td>
                </tr>
                <tr *ngIf="returns.length === 0">
                  <td colspan="4" class="p-4 text-center text-slate-500">No GST Returns generated yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GstDashboardComponent implements OnInit {
  returns: any[] = [];
  
  // Dummy client ID since we haven't integrated auth context exactly in this component
  currentClientId = 'TEST_CLIENT_ID';

  constructor(private gstService: GstService, private router: Router) {}

  ngOnInit() {
    this.fetchReturns();
  }

  fetchReturns() {
    this.gstService.getReturnsByClient(this.currentClientId).subscribe({
      next: (res: any) => {
        if(res.status === 'success') {
          this.returns = res.data;
        }
      },
      error: (err) => console.error(err)
    });
  }

  getMonthName(monthNum: number) {
    const d = new Date();
    d.setMonth(monthNum - 1);
    return d.toLocaleString('en-US', { month: 'short' });
  }

  createReturn(type: string) {
    if (type === 'GSTR-1') {
      this.router.navigate(['/compliance/gst/gstr1/new']);
    } else {
      this.router.navigate(['/compliance/gst/gstr3b/new']);
    }
  }

  editReturn(ret: any) {
    const basePath = ret.returnType === 'GSTR-1' ? '/compliance/gst/gstr1' : '/compliance/gst/gstr3b';
    this.router.navigate([`${basePath}/${ret.id}`]);
  }

  downloadJson(id: string) {
    this.gstService.exportJson(id).subscribe({
      next: (data: any) => {
        const str = JSON.stringify(data, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR_${id}.json`;
        a.click();
      }
    });
  }
}
