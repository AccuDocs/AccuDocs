import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowPathSolid,
  heroBanknotesSolid,
  heroBuildingStorefrontSolid,
  heroClipboardDocumentCheckSolid,
  heroDocumentTextSolid,
  heroFolderSolid,
  heroPlusSolid,
  heroShieldCheckSolid,
  heroTruckSolid,
} from '@ng-icons/heroicons/solid';
import { VendorService } from '../services/vendor.service';
import {
  AccountsPayableRow,
  Vendor,
  VendorBill,
  VendorDashboard,
  VendorDocument,
  VendorPayment,
  VendorPurchaseOrder,
  VendorType,
} from '../models/vendor.models';

type VendorView = 'list' | 'add' | 'purchase-orders' | 'bills' | 'payments' | 'accounts-payable' | 'documents' | 'reports';

const EMPTY_DASHBOARD: VendorDashboard = {
  totalVendors: 0,
  activeVendors: 0,
  totalPurchases: 0,
  totalOutstanding: 0,
  overdueAmount: 0,
  upcomingDue: 0,
};

@Component({
  selector: 'app-vendor-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent],
  providers: [
    provideIcons({
      heroArrowPathSolid,
      heroBanknotesSolid,
      heroBuildingStorefrontSolid,
      heroClipboardDocumentCheckSolid,
      heroDocumentTextSolid,
      heroFolderSolid,
      heroPlusSolid,
      heroShieldCheckSolid,
      heroTruckSolid,
    }),
  ],
  template: `
    <div class="vendor-page min-h-full w-full space-y-5 px-6 pb-8 pt-4">
      <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div class="relative flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98),rgba(255,247,237,0.76))] dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98),rgba(67,20,7,0.28))]"></div>
          <div class="relative max-w-4xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
              <ng-icon name="heroTruckSolid" size="14"></ng-icon>
              Vendor management
            </div>
            <h1 class="text-3xl font-black tracking-tight text-slate-950 dark:text-white xl:text-[2.6rem]">{{ title() }}</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ subtitle() }}
            </p>
          </div>

          <div class="relative flex flex-wrap items-center gap-3">
            <button type="button" (click)="refresh()" class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <ng-icon name="heroArrowPathSolid" size="16" [class.animate-spin]="isLoading()"></ng-icon>
              Refresh
            </button>
            @if (isClientScoped()) {
              <button type="button" (click)="setVendorView('add')" class="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700">
                <ng-icon name="heroPlusSolid" size="16"></ng-icon>
                Add vendor
              </button>
            } @else {
              <a routerLink="/vendors/add" class="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700">
                <ng-icon name="heroPlusSolid" size="16"></ng-icon>
                Add vendor
              </a>
            }
          </div>
        </div>
      </section>

      <nav class="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        @for (tab of tabs; track tab.route) {
          @if (isClientScoped()) {
            <button
              type="button"
              (click)="setVendorView(tab.view)"
              class="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition"
              [ngClass]="view() === tab.view ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'"
            >
              <ng-icon [name]="tab.icon" size="16"></ng-icon>
              {{ tab.label }}
            </button>
          } @else {
            <a
              [routerLink]="tab.route"
              class="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition"
              [ngClass]="view() === tab.view ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'"
            >
              <ng-icon [name]="tab.icon" size="16"></ng-icon>
              {{ tab.label }}
            </a>
          }
        }
      </nav>

      <section class="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="metric-label">Vendors</p>
          <strong class="metric-value">{{ dashboard().totalVendors }}</strong>
          <p class="metric-copy">{{ dashboard().activeVendors }} active</p>
        </article>
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="metric-label">Purchases</p>
          <strong class="metric-value">{{ money(dashboard().totalPurchases) }}</strong>
          <p class="metric-copy">All recorded bills</p>
        </article>
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="metric-label">Payable</p>
          <strong class="metric-value">{{ money(dashboard().totalOutstanding) }}</strong>
          <p class="metric-copy">Open AP balance</p>
        </article>
        <article class="rounded-[22px] border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
          <p class="metric-label text-rose-500">Overdue</p>
          <strong class="metric-value text-rose-700 dark:text-rose-200">{{ money(dashboard().overdueAmount) }}</strong>
          <p class="metric-copy text-rose-600/80 dark:text-rose-200/70">Needs follow-up</p>
        </article>
        <article class="rounded-[22px] border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
          <p class="metric-label text-amber-600">Next 7 days</p>
          <strong class="metric-value text-amber-700 dark:text-amber-200">{{ money(dashboard().upcomingDue) }}</strong>
          <p class="metric-copy text-amber-700/80 dark:text-amber-200/70">Upcoming payments</p>
        </article>
        <article class="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <p class="metric-label text-emerald-600">Documents</p>
          <strong class="metric-value text-emerald-700 dark:text-emerald-200">{{ documents().length }}</strong>
          <p class="metric-copy text-emerald-700/80 dark:text-emerald-200/70">Contracts and bills</p>
        </article>
      </section>

      @if (errorMessage()) {
        <section class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          {{ errorMessage() }}
        </section>
      }

      @if (view() === 'list') {
        <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Vendor master</p>
                <h2 class="panel-title">Vendor List</h2>
              </div>
              <input [(ngModel)]="searchTerm" name="vendorSearch" (ngModelChange)="loadVendors()" class="field max-w-xs" placeholder="Search vendors, GSTIN, mobile..." />
            </div>
            <div class="overflow-x-auto">
              <table class="data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>GST / PAN</th>
                    <th>Outstanding</th>
                    <th>Overdue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (vendor of vendors(); track vendor.id) {
                    <tr>
                      <td>
                        <p class="font-black text-slate-950 dark:text-white">{{ vendor.vendorName }}</p>
                        <p class="mt-1 text-xs font-semibold text-slate-500">{{ vendor.vendorCode }} · {{ vendor.contactPerson || vendor.businessName || 'No contact' }}</p>
                      </td>
                      <td>{{ typeLabel(vendor.vendorType) }}</td>
                      <td>
                        <p>{{ vendor.gstNumber || 'No GSTIN' }}</p>
                        <p class="text-xs text-slate-400">{{ vendor.panNumber || 'No PAN' }}</p>
                      </td>
                      <td class="font-black">{{ money(vendor.metrics?.totalOutstanding || 0) }}</td>
                      <td class="font-black text-rose-600">{{ money(vendor.metrics?.overdueAmount || 0) }}</td>
                      <td><span class="pill" [ngClass]="vendor.status === 'active' ? 'pill-green' : 'pill-red'">{{ vendor.status }}</span></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="py-12 text-center text-slate-500">No vendors yet. Add your first supplier to start AP tracking.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <aside class="panel">
            <p class="eyebrow">Workflow</p>
            <h2 class="panel-title">Real AP Flow</h2>
            <div class="mt-5 space-y-3">
              @for (step of workflowSteps; track step) {
                <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{{ step }}</div>
              }
            </div>
          </aside>
        </section>
      }

      @if (view() === 'add') {
        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Vendor master</p>
              <h2 class="panel-title">Add Vendor</h2>
            </div>
          </div>
          <form class="grid gap-4 lg:grid-cols-3" (ngSubmit)="saveVendor()">
            <label class="space-y-2"><span class="label">Vendor Name</span><input name="vendorName" [(ngModel)]="vendorForm.vendorName" required class="field" /></label>
            <label class="space-y-2"><span class="label">Business Name</span><input name="businessName" [(ngModel)]="vendorForm.businessName" class="field" /></label>
            <label class="space-y-2"><span class="label">Vendor Type</span><select name="vendorType" [(ngModel)]="vendorForm.vendorType" class="field"><option value="goods_supplier">Goods Supplier</option><option value="service_provider">Service Provider</option><option value="contractor">Contractor</option><option value="consultant">Consultant</option></select></label>
            <label class="space-y-2"><span class="label">GST Number</span><input name="gstNumber" [(ngModel)]="vendorForm.gstNumber" class="field uppercase" /></label>
            <label class="space-y-2"><span class="label">PAN Number</span><input name="panNumber" [(ngModel)]="vendorForm.panNumber" class="field uppercase" /></label>
            <label class="space-y-2"><span class="label">Contact Person</span><input name="contactPerson" [(ngModel)]="vendorForm.contactPerson" class="field" /></label>
            <label class="space-y-2"><span class="label">Mobile Number</span><input name="mobile" [(ngModel)]="vendorForm.mobile" class="field" /></label>
            <label class="space-y-2"><span class="label">Email</span><input name="email" [(ngModel)]="vendorForm.email" type="email" class="field" /></label>
            <label class="space-y-2"><span class="label">Payment Terms</span><input name="paymentTerms" [(ngModel)]="vendorForm.paymentTerms" class="field" placeholder="Net 30, advance, milestone..." /></label>
            <label class="space-y-2"><span class="label">Credit Days</span><input name="creditDays" [(ngModel)]="vendorForm.creditDays" type="number" min="0" class="field" /></label>
            <label class="space-y-2"><span class="label">Credit Limit</span><input name="creditLimit" [(ngModel)]="vendorForm.creditLimit" type="number" min="0" class="field" /></label>
            <label class="space-y-2"><span class="label">Status</span><select name="status" [(ngModel)]="vendorForm.status" class="field"><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
            <label class="space-y-2 lg:col-span-3"><span class="label">Billing Address</span><textarea name="billingAddress" [(ngModel)]="vendorForm.billingAddress" rows="3" class="field"></textarea></label>
            <label class="space-y-2 lg:col-span-3"><span class="label">Shipping Address</span><textarea name="shippingAddress" [(ngModel)]="vendorForm.shippingAddress" rows="3" class="field"></textarea></label>
            <div class="lg:col-span-3 flex justify-end">
              <button class="primary-btn" type="submit"><ng-icon name="heroPlusSolid" size="16"></ng-icon> Save Vendor</button>
            </div>
          </form>
        </section>
      }

      @if (view() === 'purchase-orders') {
        <section class="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form class="panel space-y-4" (ngSubmit)="savePurchaseOrder()">
            <p class="eyebrow">Purchase order</p>
            <h2 class="panel-title">Create PO</h2>
            <select name="poVendor" [(ngModel)]="poForm.vendorId" required class="field"><option value="">Select vendor</option>@for (vendor of vendors(); track vendor.id) { <option [value]="vendor.id">{{ vendor.vendorName }}</option> }</select>
            <input name="poDelivery" [(ngModel)]="poForm.deliveryDate" type="date" class="field" />
            <input name="poDescription" [(ngModel)]="poItem.description" class="field" placeholder="Product/service" />
            <div class="grid grid-cols-3 gap-3">
              <input name="poQty" [(ngModel)]="poItem.quantity" type="number" min="1" class="field" placeholder="Qty" />
              <input name="poRate" [(ngModel)]="poItem.rate" type="number" min="0" class="field" placeholder="Rate" />
              <input name="poGst" [(ngModel)]="poItem.gstRate" type="number" min="0" class="field" placeholder="GST %" />
            </div>
            <textarea name="poNotes" [(ngModel)]="poForm.notes" rows="3" class="field" placeholder="Approval notes or delivery terms"></textarea>
            <button class="primary-btn w-full justify-center" type="submit">Create Purchase Order</button>
          </form>
          <div class="panel">
            <div class="panel-head"><div><p class="eyebrow">PO management</p><h2 class="panel-title">Purchase Orders</h2></div></div>
            <div class="overflow-x-auto">
              <table class="data-table min-w-[900px]">
                <thead><tr><th>PO</th><th>Vendor</th><th>Delivery</th><th>Status</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  @for (po of purchaseOrders(); track po.id) {
                    <tr>
                      <td><p class="font-black">{{ po.poNumber }}</p><p class="text-xs text-slate-400">{{ po.poDate | date:'mediumDate' }}</p></td>
                      <td>{{ po.vendor?.vendorName || vendorName(po.vendorId) }}</td>
                      <td>{{ po.deliveryDate ? (po.deliveryDate | date:'mediumDate') : 'Not set' }}</td>
                      <td><span class="pill pill-blue">{{ statusText(po.status) }}</span></td>
                      <td class="font-black">{{ money(po.totalAmount) }}</td>
                      <td><button class="mini-btn" (click)="markPoSent(po)" type="button">Send</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }

      @if (view() === 'bills') {
        <section class="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form class="panel space-y-4" (ngSubmit)="saveBill()">
            <p class="eyebrow">Vendor bills</p>
            <h2 class="panel-title">Record Supplier Invoice</h2>
            <select name="billVendor" [(ngModel)]="billForm.vendorId" required class="field"><option value="">Select vendor</option>@for (vendor of vendors(); track vendor.id) { <option [value]="vendor.id">{{ vendor.vendorName }}</option> }</select>
            <input name="billNumber" [(ngModel)]="billForm.billNumber" required class="field" placeholder="Bill / invoice number" />
            <div class="grid grid-cols-2 gap-3">
              <input name="billDate" [(ngModel)]="billForm.invoiceDate" type="date" required class="field" />
              <input name="dueDate" [(ngModel)]="billForm.dueDate" type="date" class="field" />
            </div>
            <input name="billCategory" [(ngModel)]="billForm.category" class="field" placeholder="Ledger category e.g. Office Rent" />
            <div class="grid grid-cols-2 gap-3">
              <input name="taxAmount" [(ngModel)]="billForm.taxAmount" type="number" min="0" class="field" placeholder="Tax amount" />
              <input name="totalAmount" [(ngModel)]="billForm.totalAmount" type="number" min="0" required class="field" placeholder="Total amount" />
            </div>
            <input name="attachmentUrl" [(ngModel)]="billForm.attachmentUrl" class="field" placeholder="Invoice PDF/Image URL" />
            <button class="primary-btn w-full justify-center" type="submit">Record Bill</button>
          </form>
          <div class="panel">
            <div class="panel-head"><div><p class="eyebrow">Purchase invoices</p><h2 class="panel-title">Bills</h2></div></div>
            <div class="overflow-x-auto">
              <table class="data-table min-w-[900px]">
                <thead><tr><th>Bill</th><th>Vendor</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  @for (bill of bills(); track bill.id) {
                    <tr>
                      <td><p class="font-black">{{ bill.billNumber }}</p><p class="text-xs text-slate-400">{{ bill.category || 'Uncategorized' }}</p></td>
                      <td>{{ bill.vendor?.vendorName || vendorName(bill.vendorId) }}</td>
                      <td>{{ bill.dueDate | date:'mediumDate' }}</td>
                      <td class="font-black">{{ money(bill.totalAmount) }}</td>
                      <td class="font-black text-rose-600">{{ money(bill.balanceDue) }}</td>
                      <td><span class="pill" [ngClass]="bill.status === 'paid' ? 'pill-green' : bill.status === 'overdue' ? 'pill-red' : 'pill-blue'">{{ statusText(bill.status) }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }

      @if (view() === 'payments') {
        <section class="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form class="panel space-y-4" (ngSubmit)="savePayment()">
            <p class="eyebrow">Outgoing payments</p>
            <h2 class="panel-title">Record Payment</h2>
            <select name="paymentVendor" [(ngModel)]="paymentForm.vendorId" required class="field"><option value="">Select vendor</option>@for (vendor of vendors(); track vendor.id) { <option [value]="vendor.id">{{ vendor.vendorName }}</option> }</select>
            <select name="paymentBill" [(ngModel)]="paymentForm.billId" class="field"><option value="">Advance / unallocated payment</option>@for (bill of openBillsForPayment(); track bill.id) { <option [value]="bill.id">{{ bill.billNumber }} · {{ money(bill.balanceDue) }} due</option> }</select>
            <div class="grid grid-cols-2 gap-3">
              <input name="paymentAmount" [(ngModel)]="paymentForm.amount" type="number" min="1" required class="field" />
              <input name="paymentDate" [(ngModel)]="paymentForm.paymentDate" type="date" required class="field" />
            </div>
            <select name="paymentMethod" [(ngModel)]="paymentForm.paymentMethod" class="field"><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="cash">Cash</option></select>
            <input name="referenceNumber" [(ngModel)]="paymentForm.referenceNumber" class="field" placeholder="Reference / cheque number" />
            <button class="primary-btn w-full justify-center" type="submit">Record Payment</button>
          </form>
          <div class="panel">
            <div class="panel-head"><div><p class="eyebrow">Payments</p><h2 class="panel-title">Payment History</h2></div></div>
            <div class="overflow-x-auto">
              <table class="data-table min-w-[760px]">
                <thead><tr><th>Date</th><th>Vendor</th><th>Bill</th><th>Method</th><th>Amount</th></tr></thead>
                <tbody>@for (payment of payments(); track payment.id) { <tr><td>{{ payment.paymentDate | date:'mediumDate' }}</td><td>{{ payment.vendor?.vendorName || vendorName(payment.vendorId) }}</td><td>{{ payment.bill?.billNumber || 'Advance' }}</td><td>{{ statusText(payment.paymentMethod) }}</td><td class="font-black">{{ money(payment.amount) }}</td></tr> }</tbody>
              </table>
            </div>
          </div>
        </section>
      }

      @if (view() === 'accounts-payable') {
        <section class="panel">
          <div class="panel-head"><div><p class="eyebrow">Accounts payable</p><h2 class="panel-title">Aging Report</h2></div></div>
          <div class="overflow-x-auto">
            <table class="data-table min-w-[980px]">
              <thead><tr><th>Vendor</th><th>Total payable</th><th>0-30</th><th>31-60</th><th>61-90</th><th>90+</th><th>Next due</th></tr></thead>
              <tbody>
                @for (row of accountsPayable(); track row.vendorId) {
                  <tr>
                    <td><p class="font-black">{{ row.vendorName }}</p><p class="text-xs text-slate-400">{{ row.vendorCode }}</p></td>
                    <td class="font-black">{{ money(row.totalOutstanding) }}</td>
                    <td>{{ money(row.bucket0to30) }}</td>
                    <td>{{ money(row.bucket31to60) }}</td>
                    <td>{{ money(row.bucket61to90) }}</td>
                    <td class="font-black text-rose-600">{{ money(row.bucket90Plus) }}</td>
                    <td>{{ row.nextDueDate ? (row.nextDueDate | date:'mediumDate') : 'No due' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (view() === 'documents') {
        <section class="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form class="panel space-y-4" (ngSubmit)="saveDocument()">
            <p class="eyebrow">Document management</p>
            <h2 class="panel-title">Upload Reference</h2>
            <select name="docVendor" [(ngModel)]="documentForm.vendorId" required class="field"><option value="">Select vendor</option>@for (vendor of vendors(); track vendor.id) { <option [value]="vendor.id">{{ vendor.vendorName }}</option> }</select>
            <select name="documentType" [(ngModel)]="documentForm.documentType" class="field"><option value="gst_certificate">GST certificate</option><option value="contract">Contract</option><option value="agreement">Agreement</option><option value="quotation">Quotation</option><option value="bill">Bill</option><option value="other">Other</option></select>
            <input name="documentName" [(ngModel)]="documentForm.name" required class="field" placeholder="Document name" />
            <input name="fileUrl" [(ngModel)]="documentForm.fileUrl" class="field" placeholder="File URL / storage key" />
            <button class="primary-btn w-full justify-center" type="submit">Save Document</button>
          </form>
          <div class="panel">
            <div class="panel-head"><div><p class="eyebrow">Documents</p><h2 class="panel-title">Vendor Files</h2></div></div>
            <div class="grid gap-3 md:grid-cols-2">
              @for (doc of documents(); track doc.id) {
                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p class="font-black text-slate-950 dark:text-white">{{ doc.name }}</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">{{ statusText(doc.documentType) }} · {{ doc.vendor?.vendorName || vendorName(doc.vendorId) }}</p>
                  @if (doc.fileUrl) { <a [href]="doc.fileUrl" target="_blank" class="mt-3 inline-flex text-sm font-black text-orange-600">Open file</a> }
                </article>
              }
            </div>
          </div>
        </section>
      }

      @if (view() === 'reports') {
        <section class="grid gap-5 xl:grid-cols-3">
          <article class="panel">
            <p class="eyebrow">Performance</p>
            <h2 class="panel-title">Payment Cycle</h2>
            <p class="mt-5 text-4xl font-black text-slate-950 dark:text-white">{{ averagePaymentPerformance() }}%</p>
            <p class="mt-2 text-sm text-slate-500">Average bill settlement performance across vendors.</p>
          </article>
          <article class="panel">
            <p class="eyebrow">Purchase value</p>
            <h2 class="panel-title">Top vendor</h2>
            <p class="mt-5 text-2xl font-black text-slate-950 dark:text-white">{{ topVendor()?.vendorName || 'No vendor yet' }}</p>
            <p class="mt-2 text-sm text-slate-500">{{ money(topVendor()?.metrics?.totalPurchases || 0) }} recorded purchases.</p>
          </article>
          <article class="panel">
            <p class="eyebrow">Delivery quality</p>
            <h2 class="panel-title">PO Completion</h2>
            <p class="mt-5 text-4xl font-black text-slate-950 dark:text-white">{{ poCompletionRate() }}%</p>
            <p class="mt-2 text-sm text-slate-500">Completed purchase orders out of non-cancelled POs.</p>
          </article>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .panel { border: 1px solid rgb(226 232 240); background: white; border-radius: 24px; padding: 20px; box-shadow: 0 1px 2px rgba(15, 23, 42, .05); }
    .panel-head { align-items: center; border-bottom: 1px solid rgb(241 245 249); display: flex; gap: 16px; justify-content: space-between; margin: -20px -20px 20px; padding: 18px 20px; }
    .eyebrow, .metric-label, .label { color: rgb(148 163 184); font-size: 10px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
    .panel-title { color: rgb(2 6 23); font-size: 20px; font-weight: 900; letter-spacing: -.01em; }
    .metric-value { color: rgb(2 6 23); display: block; font-size: 30px; font-weight: 900; line-height: 1.1; margin-top: 10px; }
    .metric-copy { color: rgb(100 116 139); font-size: 12px; font-weight: 700; margin-top: 6px; }
    .field { border: 1px solid rgb(226 232 240); border-radius: 16px; background: rgb(248 250 252); color: rgb(51 65 85); font-size: 14px; font-weight: 700; min-height: 44px; outline: none; padding: 10px 14px; width: 100%; }
    .field:focus { border-color: rgb(251 146 60); box-shadow: 0 0 0 4px rgba(251, 146, 60, .14); }
    .primary-btn, .mini-btn { align-items: center; border-radius: 16px; display: inline-flex; font-size: 14px; font-weight: 900; gap: 8px; justify-content: center; transition: .18s ease; }
    .primary-btn { background: rgb(234 88 12); color: white; padding: 12px 18px; }
    .primary-btn:hover { background: rgb(194 65 12); }
    .mini-btn { border: 1px solid rgb(226 232 240); color: rgb(71 85 105); padding: 8px 12px; }
    .data-table { border-collapse: collapse; width: 100%; }
    .data-table th { color: rgb(148 163 184); font-size: 11px; font-weight: 900; letter-spacing: .14em; padding: 12px 14px; text-align: left; text-transform: uppercase; }
    .data-table td { border-top: 1px solid rgb(241 245 249); color: rgb(71 85 105); font-size: 14px; font-weight: 700; padding: 14px; }
    .pill { border-radius: 999px; display: inline-flex; font-size: 10px; font-weight: 900; letter-spacing: .14em; padding: 6px 10px; text-transform: uppercase; }
    .pill-green { background: rgb(220 252 231); color: rgb(4 120 87); }
    .pill-red { background: rgb(255 228 230); color: rgb(190 18 60); }
    .pill-blue { background: rgb(219 234 254); color: rgb(29 78 216); }
    @media (prefers-color-scheme: dark) {
      .panel { background: rgb(15 23 42); border-color: rgb(51 65 85); }
      .panel-head { border-color: rgb(51 65 85); }
      .panel-title, .metric-value { color: white; }
      .field { background: rgb(30 41 59); border-color: rgb(51 65 85); color: rgb(226 232 240); }
      .data-table td { border-color: rgb(51 65 85); color: rgb(203 213 225); }
      .mini-btn { border-color: rgb(51 65 85); color: rgb(203 213 225); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorManagementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly vendorService = inject(VendorService);
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });

  readonly clientId = input<string | null>(null);
  private readonly embeddedView = signal<VendorView>('list');
  private readonly scopedClientId = computed(() => this.clientId()?.trim() || null);
  readonly isClientScoped = computed(() => !!this.scopedClientId());
  readonly view = computed<VendorView>(() => this.isClientScoped() ? this.embeddedView() : (this.routeData()['view'] || 'list') as VendorView);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly dashboard = signal<VendorDashboard>(EMPTY_DASHBOARD);
  readonly vendors = signal<Vendor[]>([]);
  readonly purchaseOrders = signal<VendorPurchaseOrder[]>([]);
  readonly bills = signal<VendorBill[]>([]);
  readonly payments = signal<VendorPayment[]>([]);
  readonly accountsPayable = signal<AccountsPayableRow[]>([]);
  readonly documents = signal<VendorDocument[]>([]);

  searchTerm = '';
  readonly workflowSteps = [
    'Create Vendor',
    'Create Purchase Order',
    'Receive Goods / Services',
    'Vendor Sends Bill',
    'Accounts Verification',
    'Payment Processing',
    'Ledger Entry + Reports',
  ];

  readonly tabs = [
    { view: 'list', label: 'Vendor List', route: '/vendors', icon: 'heroBuildingStorefrontSolid' },
    { view: 'add', label: 'Add Vendor', route: '/vendors/add', icon: 'heroPlusSolid' },
    { view: 'purchase-orders', label: 'Purchase Orders', route: '/vendors/purchase-orders', icon: 'heroClipboardDocumentCheckSolid' },
    { view: 'bills', label: 'Bills', route: '/vendors/bills', icon: 'heroDocumentTextSolid' },
    { view: 'payments', label: 'Payments', route: '/vendors/payments', icon: 'heroBanknotesSolid' },
    { view: 'accounts-payable', label: 'Accounts Payable', route: '/vendors/accounts-payable', icon: 'heroShieldCheckSolid' },
    { view: 'documents', label: 'Documents', route: '/vendors/documents', icon: 'heroFolderSolid' },
    { view: 'reports', label: 'Reports', route: '/vendors/reports', icon: 'heroTruckSolid' },
  ] as const;

  vendorForm: Partial<Vendor> = {
    vendorName: '',
    businessName: '',
    vendorType: 'goods_supplier',
    status: 'active',
    creditDays: 30,
    creditLimit: 0,
  };

  poForm = { vendorId: '', deliveryDate: '', notes: '', status: 'draft' };
  poItem = { description: '', quantity: 1, rate: 0, gstRate: 18 };
  billForm = { vendorId: '', billNumber: '', invoiceDate: this.today(), dueDate: '', category: '', taxAmount: 0, totalAmount: 0, attachmentUrl: '' };
  paymentForm = { vendorId: '', billId: '', amount: 0, paymentDate: this.today(), paymentMethod: 'bank_transfer', referenceNumber: '' };
  documentForm = { vendorId: '', documentType: 'gst_certificate', name: '', fileUrl: '' };

  readonly title = computed(() => {
    const titles: Record<VendorView, string> = {
      list: 'Vendor Directory',
      add: 'Add Vendor',
      'purchase-orders': 'Purchase Order Management',
      bills: 'Vendor Bills',
      payments: 'Payment Management',
      'accounts-payable': 'Accounts Payable',
      documents: 'Vendor Documents',
      reports: 'Vendor Reports',
    };
    return titles[this.view()];
  });
  readonly subtitle = computed(() =>
    this.isClientScoped()
      ? 'Manage this client workspace supplier master, purchase orders, vendor bills, payments, AP aging, documents, and performance analytics.'
      : 'Manage suppliers, purchase orders, vendor bills, outgoing payments, payable aging, documents, and performance analytics for CA firm and SME workflows.'
  );

  readonly openBillsForPayment = computed(() =>
    this.bills().filter((bill) => !this.paymentForm.vendorId || bill.vendorId === this.paymentForm.vendorId).filter((bill) => Number(bill.balanceDue || 0) > 0)
  );
  readonly topVendor = computed<Vendor | null>(() =>
    [...this.vendors()].sort((a, b) => Number(b.metrics?.totalPurchases || 0) - Number(a.metrics?.totalPurchases || 0))[0] || null
  );

  ngOnInit(): void {
    this.refresh();
  }

  setVendorView(view: VendorView): void {
    this.embeddedView.set(view);
  }

  refresh(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.loadDashboard();
    this.loadVendors();
    this.loadPurchaseOrders();
    this.loadBills();
    this.loadPayments();
    this.loadAccountsPayable();
    this.loadDocuments();
    setTimeout(() => this.isLoading.set(false), 300);
  }

  loadDashboard(): void {
    this.vendorService.getDashboard(this.scopeParams()).subscribe({ next: (res) => this.dashboard.set(res.data || EMPTY_DASHBOARD), error: () => this.errorMessage.set('Vendor dashboard could not be loaded') });
  }

  loadVendors(): void {
    this.vendorService.getVendors({ ...this.scopeParams(), search: this.searchTerm, limit: 100 }).subscribe({ next: (res) => this.vendors.set(res.data || []), error: () => this.errorMessage.set('Vendors could not be loaded') });
  }

  loadPurchaseOrders(): void {
    this.vendorService.getPurchaseOrders(this.scopeParams()).subscribe({ next: (res) => this.purchaseOrders.set(res.data || []), error: () => undefined });
  }

  loadBills(): void {
    this.vendorService.getBills(this.scopeParams()).subscribe({ next: (res) => this.bills.set(res.data || []), error: () => undefined });
  }

  loadPayments(): void {
    this.vendorService.getPayments(this.scopeParams()).subscribe({ next: (res) => this.payments.set(res.data || []), error: () => undefined });
  }

  loadAccountsPayable(): void {
    this.vendorService.getAccountsPayable(this.scopeParams()).subscribe({ next: (res) => this.accountsPayable.set(res.data || []), error: () => undefined });
  }

  loadDocuments(): void {
    this.vendorService.getDocuments(this.scopeParams()).subscribe({ next: (res) => this.documents.set(res.data || []), error: () => undefined });
  }

  saveVendor(): void {
    if (!this.vendorForm.vendorName) return;
    this.vendorService.createVendor(this.withScope(this.vendorForm)).subscribe({
      next: () => {
        this.vendorForm = { vendorName: '', vendorType: 'goods_supplier', status: 'active', creditDays: 30, creditLimit: 0 };
        this.setVendorView('list');
        this.refresh();
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Vendor could not be saved'),
    });
  }

  savePurchaseOrder(): void {
    if (!this.poForm.vendorId || !this.poItem.description) return;
    this.vendorService.createPurchaseOrder(this.withScope({ ...this.poForm, items: [this.poItem] })).subscribe({
      next: () => { this.poForm = { vendorId: '', deliveryDate: '', notes: '', status: 'draft' }; this.poItem = { description: '', quantity: 1, rate: 0, gstRate: 18 }; this.refresh(); },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Purchase order could not be saved'),
    });
  }

  saveBill(): void {
    if (!this.billForm.vendorId || !this.billForm.billNumber) return;
    this.vendorService.createBill(this.withScope(this.billForm)).subscribe({
      next: () => { this.billForm = { vendorId: '', billNumber: '', invoiceDate: this.today(), dueDate: '', category: '', taxAmount: 0, totalAmount: 0, attachmentUrl: '' }; this.refresh(); },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Vendor bill could not be saved'),
    });
  }

  savePayment(): void {
    if (!this.paymentForm.vendorId || Number(this.paymentForm.amount || 0) <= 0) return;
    this.vendorService.createPayment(this.withScope(this.paymentForm)).subscribe({
      next: () => { this.paymentForm = { vendorId: '', billId: '', amount: 0, paymentDate: this.today(), paymentMethod: 'bank_transfer', referenceNumber: '' }; this.refresh(); },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Payment could not be saved'),
    });
  }

  saveDocument(): void {
    if (!this.documentForm.vendorId || !this.documentForm.name) return;
    this.vendorService.createDocument(this.withScope(this.documentForm)).subscribe({
      next: () => { this.documentForm = { vendorId: '', documentType: 'gst_certificate', name: '', fileUrl: '' }; this.refresh(); },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Document could not be saved'),
    });
  }

  markPoSent(po: VendorPurchaseOrder): void {
    this.vendorService.updatePurchaseOrderStatus(po.id, 'sent').subscribe({ next: () => this.loadPurchaseOrders() });
  }

  vendorName(id: string): string {
    return this.vendors().find((vendor) => vendor.id === id)?.vendorName || 'Vendor unavailable';
  }

  typeLabel(type: VendorType): string {
    return this.statusText(type);
  }

  statusText(value?: string | null): string {
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  money(value: unknown): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  averagePaymentPerformance(): number {
    if (this.vendors().length === 0) return 0;
    const total = this.vendors().reduce((sum, vendor) => sum + Number(vendor.metrics?.paymentPerformance || 0), 0);
    return Math.round(total / this.vendors().length);
  }

  poCompletionRate(): number {
    const relevant = this.purchaseOrders().filter((po) => po.status !== 'cancelled');
    if (relevant.length === 0) return 0;
    return Math.round((relevant.filter((po) => po.status === 'completed').length / relevant.length) * 100);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private scopeParams(): Record<string, string | undefined> {
    const clientId = this.scopedClientId();
    return clientId ? { clientId } : {};
  }

  private withScope<T extends object>(payload: T): T & { clientId?: string } {
    const clientId = this.scopedClientId();
    return clientId ? { ...payload, clientId } : payload;
  }
}
