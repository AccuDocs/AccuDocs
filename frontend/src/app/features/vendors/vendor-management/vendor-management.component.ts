import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowPathSolid,
  heroBanknotesSolid,
  heroBuildingStorefrontSolid,
  heroClipboardDocumentCheckSolid,
  heroDocumentTextSolid,
  heroFolderSolid,
  heroPencilSquareSolid,
  heroPlusSolid,
  heroShieldCheckSolid,
  heroTruckSolid,
  heroTrashSolid,
  heroXMarkSolid,
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
      heroPencilSquareSolid,
      heroPlusSolid,
      heroShieldCheckSolid,
      heroTruckSolid,
      heroTrashSolid,
      heroXMarkSolid,
    }),
  ],
  template: `
    <div
      class="vendor-page min-h-full w-full min-w-0 max-w-none space-y-5 animate-in fade-in duration-500"
      [class.px-6]="!isClientScoped()"
      [class.pb-8]="!isClientScoped()"
      [class.pt-4]="!isClientScoped()"
    >
      <section class="overflow-hidden rounded-3xl border border-primary-200 bg-gradient-to-br from-white via-primary-50/40 to-white p-5 shadow-sm dark:border-slate-700 dark:bg-none dark:bg-slate-900">
        <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative max-w-4xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
              <ng-icon name="heroTruckSolid" size="14"></ng-icon>
              {{ isClientScoped() ? 'Client vendor workspace' : 'Vendor management' }}
            </div>
            <h1 class="font-black tracking-tight text-slate-950 dark:text-white" [ngClass]="isClientScoped() ? 'text-2xl' : 'text-3xl xl:text-[2.6rem]'">{{ title() }}</h1>
            <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
              {{ subtitle() }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700">
                Vendor master
              </span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700">
                PO to payment
              </span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700">
                AP aging
              </span>
            </div>
          </div>

          <div class="relative flex flex-wrap items-center gap-3">
            <button type="button" (click)="refresh()" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/50 dark:hover:bg-primary-500/15 dark:hover:text-primary-200">
              <ng-icon name="heroArrowPathSolid" size="16" [class.animate-spin]="isLoading()"></ng-icon>
              Refresh
            </button>
            <button type="button" (click)="startAddVendor()" class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-primary-700">
              <ng-icon name="heroPlusSolid" size="16"></ng-icon>
              Add vendor
            </button>
          </div>
        </div>
      </section>

      <nav class="vendor-tabs no-scrollbar flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        @for (tab of tabs; track tab.route) {
          @if (isClientScoped()) {
            <button
              type="button"
              (click)="openVendorTab(tab.view)"
              class="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[12px] font-bold transition-all"
              [ngClass]="view() === tab.view ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-700' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'"
            >
              <ng-icon [name]="tab.icon" size="16"></ng-icon>
              {{ tab.label }}
            </button>
          } @else {
            <a
              [routerLink]="tab.route"
              (click)="prepareVendorRouteTab(tab.view)"
              class="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-[12px] font-bold transition-all"
              [ngClass]="view() === tab.view ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-primary-300 dark:ring-slate-700' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'"
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
        <section class="vendor-list-section">
          <div class="panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Vendor master</p>
                <h2 class="panel-title">Vendor List</h2>
              </div>
              <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <input [(ngModel)]="searchTerm" name="vendorSearch" (ngModelChange)="loadVendors()" class="field sm:w-72" placeholder="Search vendors, GSTIN, mobile..." />
                <button type="button" class="primary-btn whitespace-nowrap" (click)="startAddVendor()">
                  <ng-icon name="heroPlusSolid" size="16"></ng-icon>
                  Add Vendor
                </button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="data-table min-w-[1160px]">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>GST / PAN</th>
                    <th>Outstanding</th>
                    <th>Overdue</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (vendor of vendors(); track vendor.id) {
                    <tr>
                      <td>
                        <p class="font-black text-slate-950 dark:text-white">{{ vendor.vendorName }}</p>
                        <p class="mt-1 text-xs font-semibold text-slate-500">{{ vendor.vendorCode }} - {{ vendor.contactPerson || vendor.businessName || 'No contact' }}</p>
                      </td>
                      <td>{{ typeLabel(vendor.vendorType) }}</td>
                      <td>
                        <p>{{ vendor.gstNumber || 'No GSTIN' }}</p>
                        <p class="text-xs text-slate-400">{{ vendor.panNumber || 'No PAN' }}</p>
                      </td>
                      <td class="font-black">{{ money(vendor.metrics?.totalOutstanding || 0) }}</td>
                      <td class="font-black text-rose-600">{{ money(vendor.metrics?.overdueAmount || 0) }}</td>
                      <td><span class="pill" [ngClass]="vendor.status === 'active' ? 'pill-green' : 'pill-red'">{{ vendor.status }}</span></td>
                      <td class="action-cell">
                        <div class="flex flex-wrap gap-2">
                          <button type="button" class="mini-btn" (click)="startEditVendor(vendor)" [attr.aria-label]="'Edit ' + vendor.vendorName" title="Edit vendor">
                            <ng-icon name="heroPencilSquareSolid" size="14"></ng-icon>
                            Edit
                          </button>
                          <button type="button" class="mini-btn danger-btn" (click)="deleteVendor(vendor)" [attr.aria-label]="'Delete ' + vendor.vendorName" title="Delete vendor">
                            <ng-icon name="heroTrashSolid" size="14"></ng-icon>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="py-12 text-center text-slate-500">No vendors yet. Add your first supplier to start AP tracking.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }

      @if (view() === 'add') {
        <section class="panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Vendor master</p>
              <h2 class="panel-title">{{ editingVendorId() ? 'Edit Vendor' : 'Add Vendor' }}</h2>
            </div>
            @if (editingVendorId()) {
              <button type="button" class="mini-btn" (click)="cancelVendorEdit()">
                <ng-icon name="heroXMarkSolid" size="16"></ng-icon>
                Cancel edit
              </button>
            }
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
            <div class="lg:col-span-3 flex flex-wrap justify-end gap-3">
              @if (editingVendorId()) {
                <button class="mini-btn" type="button" (click)="cancelVendorEdit()"><ng-icon name="heroXMarkSolid" size="16"></ng-icon> Cancel</button>
              }
              <button class="primary-btn" type="submit">
                <ng-icon [name]="editingVendorId() ? 'heroPencilSquareSolid' : 'heroPlusSolid'" size="16"></ng-icon>
                {{ editingVendorId() ? 'Update Vendor' : 'Save Vendor' }}
              </button>
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
            <select name="paymentBill" [(ngModel)]="paymentForm.billId" class="field"><option value="">Advance / unallocated payment</option>@for (bill of openBillsForPayment(); track bill.id) { <option [value]="bill.id">{{ bill.billNumber }} - {{ money(bill.balanceDue) }} due</option> }</select>
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
                  <p class="mt-1 text-xs font-semibold text-slate-500">{{ statusText(doc.documentType) }} - {{ doc.vendor?.vendorName || vendorName(doc.vendorId) }}</p>
                  @if (doc.fileUrl) { <a [href]="doc.fileUrl" target="_blank" class="mt-3 inline-flex text-sm font-black text-primary-600 dark:text-primary-300">Open file</a> }
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
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      overflow-x: hidden;
    }

    .vendor-page {
      color: var(--text-primary, #0f172a);
    }

    .vendor-tabs {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .vendor-tabs::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .vendor-list-section {
      width: 100%;
    }

    .panel {
      border: 1px solid var(--ad-card-border, #e2e8f0);
      background: var(--ad-card-bg, #ffffff);
      border-radius: 24px;
      padding: 20px;
      box-shadow: var(--shadow-card, 0 1px 2px rgba(15, 23, 42, .05));
      color: var(--text-primary, #0f172a);
    }

    .panel-head {
      align-items: center;
      border-bottom: 1px solid var(--border-subtle, #f1f5f9);
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin: -20px -20px 20px;
      padding: 18px 20px;
    }

    .eyebrow,
    .metric-label,
    .label {
      color: var(--ad-text-muted, #94a3b8);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .18em;
      text-transform: uppercase;
    }

    .panel-title {
      color: var(--ad-text-primary, #020617);
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0;
    }

    .metric-value {
      color: var(--ad-text-primary, #020617);
      display: block;
      font-size: 30px;
      font-weight: 900;
      line-height: 1.1;
      margin-top: 10px;
    }

    .metric-copy {
      color: var(--ad-text-secondary, #64748b);
      font-size: 12px;
      font-weight: 700;
      margin-top: 6px;
    }

    .field {
      border: 1px solid var(--ad-card-border, #e2e8f0);
      border-radius: 16px;
      background: var(--surface-elevated, #f8fafc);
      color: var(--text-secondary, #334155);
      font-size: 14px;
      font-weight: 700;
      min-height: 44px;
      outline: none;
      padding: 10px 14px;
      width: 100%;
    }

    .field:focus {
      border-color: var(--primary-400, #60a5fa);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, .14);
    }

    .primary-btn,
    .mini-btn {
      align-items: center;
      border-radius: 16px;
      display: inline-flex;
      font-size: 14px;
      font-weight: 900;
      gap: 8px;
      justify-content: center;
      transition: .18s ease;
    }

    .primary-btn {
      background: var(--primary-600, #1d4ed8);
      color: white;
      padding: 12px 18px;
    }

    .primary-btn:hover {
      background: var(--primary-700, #1e40af);
    }

    .mini-btn {
      border: 1px solid var(--ad-card-border, #e2e8f0);
      color: var(--ad-text-secondary, #475569);
      padding: 8px 12px;
    }

    .mini-btn:hover {
      border-color: var(--primary-200, #bfdbfe);
      background: var(--primary-50, #eff6ff);
      color: var(--primary-700, #1e40af);
    }

    .danger-btn {
      color: rgb(190 18 60);
    }

    .danger-btn:hover {
      border-color: rgb(254 205 211);
      background: rgb(255 241 242);
      color: rgb(190 18 60);
    }

    .data-table {
      border-collapse: collapse;
      width: 100%;
    }

    .data-table th {
      background: var(--surface-elevated, #f8fafc);
      color: var(--ad-text-muted, #94a3b8);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .14em;
      padding: 12px 14px;
      text-align: left;
      text-transform: uppercase;
    }

    .data-table td {
      border-top: 1px solid var(--border-subtle, #f1f5f9);
      color: var(--ad-text-secondary, #475569);
      font-size: 14px;
      font-weight: 700;
      padding: 14px;
    }

    .action-cell {
      min-width: 190px;
      white-space: nowrap;
    }

    .action-cell .mini-btn {
      min-height: 34px;
      padding: 7px 10px;
    }

    .data-table tbody tr:hover {
      background: rgba(59, 130, 246, .06);
    }

    .pill {
      border-radius: 999px;
      display: inline-flex;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .14em;
      padding: 6px 10px;
      text-transform: uppercase;
    }

    .pill-green { background: rgb(220 252 231); color: rgb(4 120 87); }
    .pill-red { background: rgb(255 228 230); color: rgb(190 18 60); }
    .pill-blue { background: rgb(219 234 254); color: rgb(29 78 216); }

    :host-context(.dark) .panel {
      background: var(--surface-color, #10213a);
      border-color: var(--border-color, #334155);
      color: var(--text-primary, #eaf2fc);
    }

    :host-context(.dark) .panel-head,
    :host-context(.dark) .data-table td,
    :host-context(.dark) .data-table th,
    :host-context(.dark) .mini-btn {
      border-color: var(--border-color, #334155);
    }

    :host-context(.dark) .field,
    :host-context(.dark) .data-table th {
      background: #14243c;
      color: var(--text-primary, #eaf2fc);
    }

    :host-context(.dark) .data-table td,
    :host-context(.dark) .mini-btn {
      color: var(--text-secondary, #b8c7d9);
    }

    :host-context(.dark) .mini-btn:hover,
    :host-context(.dark) .data-table tbody tr:hover {
      background: rgba(96, 165, 250, .12);
      border-color: rgba(147, 197, 253, .32);
      color: var(--accent-hover, #93c5fd);
    }

    :host-context(.dark) .danger-btn {
      color: #fda4af;
    }

    :host-context(.dark) .danger-btn:hover {
      background: rgba(244, 63, 94, .14);
      border-color: rgba(251, 113, 133, .36);
      color: #fecdd3;
    }

    :host-context(.dark) .pill-green { background: rgba(16, 185, 129, .16); color: #86efac; }
    :host-context(.dark) .pill-red { background: rgba(244, 63, 94, .16); color: #fda4af; }
    :host-context(.dark) .pill-blue { background: rgba(96, 165, 250, .16); color: #bfdbfe; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorManagementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  readonly editingVendorId = signal<string | null>(null);

  searchTerm = '';
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
    this.applyVendorSelectionFromQuery();
    this.refresh();
  }

  setVendorView(view: VendorView): void {
    this.embeddedView.set(view);
  }

  openVendorTab(view: VendorView): void {
    if (view === 'add') {
      this.resetVendorForm();
    }
    this.setVendorView(view);
  }

  prepareVendorRouteTab(view: VendorView): void {
    if (view === 'add') {
      this.resetVendorForm();
    }
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
    const vendorId = this.editingVendorId();
    if (vendorId) {
      this.vendorService.updateVendor(vendorId, this.withScope(this.vendorForm)).subscribe({
        next: () => {
          this.resetVendorForm();
          this.goToVendorList();
          this.refresh();
        },
        error: (error) => this.errorMessage.set(error?.error?.message || 'Vendor could not be updated'),
      });
      return;
    }

    this.vendorService.createVendor(this.withScope(this.vendorForm)).subscribe({
      next: () => {
        this.resetVendorForm();
        this.goToVendorList();
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

  startAddVendor(): void {
    this.resetVendorForm();
    if (this.isClientScoped()) {
      this.setVendorView('add');
      return;
    }

    void this.router.navigateByUrl('/vendors/add');
  }

  startEditVendor(vendor: Vendor): void {
    this.populateVendorForm(vendor);
    if (this.isClientScoped()) {
      this.setVendorView('add');
      return;
    }

    void this.router.navigateByUrl(`/vendors/add?editVendorId=${encodeURIComponent(vendor.id)}`);
  }

  cancelVendorEdit(): void {
    this.resetVendorForm();
    this.goToVendorList();
  }

  deleteVendor(vendor: Vendor): void {
    if (!window.confirm(`Delete ${vendor.vendorName}? This will remove it from the vendor list.`)) return;

    this.vendorService.deleteVendor(vendor.id, this.scopeParams()).subscribe({
      next: () => {
        if (this.editingVendorId() === vendor.id) {
          this.resetVendorForm();
        }
        this.refresh();
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Vendor could not be deleted'),
    });
  }

  openVendorAction(vendor: Vendor, view: 'purchase-orders' | 'bills' | 'payments'): void {
    this.prefillVendorAction(vendor.id, view);
    if (this.isClientScoped()) {
      this.setVendorView(view);
      return;
    }

    const route = this.tabs.find((tab) => tab.view === view)?.route || '/vendors';
    void this.router.navigateByUrl(`${route}?vendorId=${encodeURIComponent(vendor.id)}`);
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

  private applyVendorSelectionFromQuery(): void {
    const editVendorId = this.route.snapshot.queryParamMap.get('editVendorId');
    if (this.view() === 'add' && editVendorId) {
      this.loadVendorForEdit(editVendorId);
      return;
    }

    const vendorId = this.route.snapshot.queryParamMap.get('vendorId');
    if (!vendorId) return;

    const view = this.view();
    if (view === 'purchase-orders' || view === 'bills' || view === 'payments') {
      this.prefillVendorAction(vendorId, view);
    }
  }

  private prefillVendorAction(vendorId: string, view: 'purchase-orders' | 'bills' | 'payments'): void {
    if (view === 'purchase-orders') {
      this.poForm.vendorId = vendorId;
      return;
    }

    if (view === 'bills') {
      this.billForm.vendorId = vendorId;
      return;
    }

    this.paymentForm.vendorId = vendorId;
  }

  private loadVendorForEdit(vendorId: string): void {
    this.vendorService.getVendor(vendorId, this.scopeParams()).subscribe({
      next: (res) => {
        if (res.data) {
          this.populateVendorForm(res.data);
        }
      },
      error: (error) => this.errorMessage.set(error?.error?.message || 'Vendor could not be loaded for editing'),
    });
  }

  private populateVendorForm(vendor: Vendor): void {
    this.editingVendorId.set(vendor.id);
    this.vendorForm = {
      vendorName: vendor.vendorName,
      businessName: vendor.businessName || '',
      vendorType: vendor.vendorType,
      gstNumber: vendor.gstNumber || '',
      panNumber: vendor.panNumber || '',
      contactPerson: vendor.contactPerson || '',
      mobile: vendor.mobile || '',
      email: vendor.email || '',
      billingAddress: vendor.billingAddress || '',
      shippingAddress: vendor.shippingAddress || '',
      paymentTerms: vendor.paymentTerms || '',
      creditDays: vendor.creditDays,
      creditLimit: vendor.creditLimit,
      status: vendor.status,
      notes: vendor.notes || '',
    };
  }

  private resetVendorForm(): void {
    this.editingVendorId.set(null);
    this.vendorForm = {
      vendorName: '',
      businessName: '',
      vendorType: 'goods_supplier',
      status: 'active',
      creditDays: 30,
      creditLimit: 0,
    };
  }

  private goToVendorList(): void {
    if (this.isClientScoped()) {
      this.setVendorView('list');
      return;
    }

    void this.router.navigateByUrl('/vendors');
  }
}
