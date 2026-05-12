import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientsFacade } from './clients-list.facade';
import { ClientFormComponent } from '../client-form/client-form.component';
import { Client } from '@core/services/client.service';
import { DataTableComponent } from '../../../shared/data-table/data-table.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowPathSolid,
  heroCheckCircleSolid,
  heroFolderOpenSolid,
  heroMagnifyingGlassSolid,
  heroPencilSquareSolid,
  heroPlusSolid,
  heroTrashSolid,
  heroUserGroupSolid,
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    DataTableComponent,
    NgIconComponent,
  ],
  providers: [
    ClientsFacade,
    provideIcons({
      heroArrowPathSolid,
      heroCheckCircleSolid,
      heroFolderOpenSolid,
      heroMagnifyingGlassSolid,
      heroPencilSquareSolid,
      heroPlusSolid,
      heroTrashSolid,
      heroUserGroupSolid,
    }),
  ],
  template: `
    <div class="client-directory-page min-h-full w-full space-y-6 px-6 pb-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div class="relative flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div class="hero-glow absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98),rgba(239,246,255,0.72))]"></div>

          <div class="relative max-w-4xl">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              <ng-icon name="heroUserGroupSolid" size="14"></ng-icon>
              Client relationship workspace
            </div>
            <h1 class="text-3xl font-black tracking-tight text-slate-950 dark:text-white xl:text-[2.7rem]">Client Directory</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Manage client records, keep contact details clean, and jump straight into each workspace from one operational directory.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700">
                Search by name, mobile, or code
              </span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700">
                Open any client workspace instantly
              </span>
              <span class="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:ring-slate-700">
                Export current records
              </span>
            </div>
          </div>

          <div class="relative flex flex-wrap items-center gap-3">
            <button
              type="button"
              (click)="facade.reload()"
              class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/15 dark:hover:text-blue-200"
            >
              <ng-icon name="heroArrowPathSolid" size="16" [class.animate-spin]="facade.isLoading()"></ng-icon>
              Refresh
            </button>
            <button
              type="button"
              (click)="onAdd()"
              class="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <ng-icon name="heroPlusSolid" size="16"></ng-icon>
              New client
            </button>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Total clients</p>
          <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950 dark:text-white">{{ facade.totalCount() }}</strong>
          <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Registered client records in the directory</p>
        </article>
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Active on this page</p>
          <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950 dark:text-white">{{ activeClientsCount() }}</strong>
          <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Currently active client logins in this result</p>
        </article>
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">GST registered</p>
          <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950 dark:text-white">{{ gstRegisteredCount() }}</strong>
          <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Clients with GSTIN available on this page</p>
        </article>
        <article class="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">FY workspaces</p>
          <strong class="mt-3 block text-4xl font-black tracking-tight text-slate-950 dark:text-white">{{ workspaceYearsCount() }}</strong>
          <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Financial-year workspaces across visible rows</p>
        </article>
      </section>

      <section class="pt-1">
        <app-data-table
          title="Client Directory"
          [tableData]="facade.clients()"
          [tableColumns]="tableColumns"
          [serverSide]="true"
          [canAdd]="false"
          [totalCount]="facade.totalCount()"
          [loading]="facade.isLoading()"
          [actionsTemplate]="actionsTpl()"
          [rowClass]="getRowClass"
          [addFormComponent]="clientFormComponent"
          [updateFormComponent]="clientFormComponent"
          (loadMore)="facade.updatePagination($event.offset, $event.limit)"
          (search)="facade.updateSearch($event)"
          (modalClosed)="facade.reload()"
        >
          <div class="flex flex-wrap items-center gap-2" filters>
            <select
              [ngModel]="sortOption()"
              (ngModelChange)="onSortOptionChange($event)"
              class="h-[40px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-950"
            >
              <option value="createdDesc">Newest first</option>
              <option value="updatedDesc">Recently updated</option>
              <option value="codeAsc">Code A-Z</option>
              <option value="codeDesc">Code Z-A</option>
            </select>

            <select
              [ngModel]="pageSizeOption()"
              (ngModelChange)="onPageSizeChange($event)"
              class="h-[40px] rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-950"
            >
              <option [ngValue]="10">10 / page</option>
              <option [ngValue]="20">20 / page</option>
              <option [ngValue]="50">50 / page</option>
            </select>

            <div class="hidden lg:flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {{ facade.clients().length }} visible row{{ facade.clients().length === 1 ? '' : 's' }}
            </div>
          </div>
        </app-data-table>
      </section>

      <ng-template #clientTemplate let-row>
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600">
            {{ getClientInitials(row) }}
          </span>
          <div class="min-w-0">
            <div class="truncate text-sm font-black text-slate-900 dark:text-white">{{ row.user?.name || 'Unnamed client' }}</div>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span class="rounded-full bg-slate-100 px-2.5 py-1 font-black text-slate-600 dark:bg-slate-700 dark:text-slate-200">{{ row.code }}</span>
              <span>{{ row.businessName || formatEntityType(row.entityType) || 'Client workspace' }}</span>
            </div>
          </div>
        </div>
      </ng-template>

      <ng-template #contactTemplate let-row>
        <div class="space-y-1">
          <div class="text-sm font-black text-slate-900 dark:text-white">{{ row.user?.mobile || row.mobile || 'No mobile' }}</div>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ row.email || row.location || row.city || 'No email or location added' }}
          </div>
        </div>
      </ng-template>

      <ng-template #profileTemplate let-row>
        <div class="space-y-2">
          <div class="flex flex-wrap gap-2.5">
            <span class="inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              [ngClass]="row.gstin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
              {{ row.gstin ? 'GST registered' : 'No GSTIN' }}
            </span>
            <span class="inline-flex min-h-7 items-center rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              {{ row.years?.length || 0 }} FY
            </span>
          </div>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ row.pan || row.gstin || 'PAN or GSTIN not added yet' }}
          </div>
        </div>
      </ng-template>

      <ng-template #statusTemplate let-row>
        <div class="space-y-1">
          <span class="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
            [ngClass]="row.user?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
            {{ row.user?.isActive ? 'Active' : 'Inactive' }}
          </span>
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Updated {{ row.updatedAt | date:'dd MMM yyyy' }}
          </div>
        </div>
      </ng-template>

      <ng-template #actionsTemplate let-row>
        <div class="flex items-center justify-end gap-2">
          <button
            [routerLink]="['/workspace', row.id]"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25"
            title="Open Workspace"
          >
            <ng-icon name="heroFolderOpenSolid" size="16"></ng-icon>
          </button>

          <button
            (click)="onEdit(row)"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-100 bg-amber-50 text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md dark:border-amber-300/30 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
            title="Edit Client"
          >
            <ng-icon name="heroPencilSquareSolid" size="16"></ng-icon>
          </button>

          <button
            (click)="onDelete(row)"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50 text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-md dark:border-rose-300/30 dark:bg-rose-400/15 dark:text-rose-200 dark:hover:bg-rose-400/25"
            title="Delete Client"
          >
            <ng-icon name="heroTrashSolid" size="16"></ng-icon>
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }

    :host-context(.dark) .client-directory-page {
      background: #081321;
      color: var(--text-primary);
    }

    :host-context(.dark) .hero-glow {
      background:
        radial-gradient(circle at top left, rgba(96, 165, 250, 0.16), transparent 34%),
        linear-gradient(135deg, rgba(15, 29, 49, 0.98), rgba(16, 33, 58, 0.96), rgba(12, 26, 45, 0.94)) !important;
    }

    :host-context(.dark) app-data-table {
      display: block;
    }

    :host-context(.dark) ::ng-deep app-data-table > div {
      background: var(--surface-color) !important;
      border-color: var(--border-color) !important;
      color: var(--text-primary) !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsListComponent {
  readonly facade = inject(ClientsFacade);
  readonly clientFormComponent = ClientFormComponent;

  readonly clientTpl = viewChild.required<TemplateRef<any>>('clientTemplate');
  readonly contactTpl = viewChild.required<TemplateRef<any>>('contactTemplate');
  readonly profileTpl = viewChild.required<TemplateRef<any>>('profileTemplate');
  readonly statusTpl = viewChild.required<TemplateRef<any>>('statusTemplate');
  readonly actionsTpl = viewChild.required<TemplateRef<any>>('actionsTemplate');

  readonly sortOption = signal<'createdDesc' | 'updatedDesc' | 'codeAsc' | 'codeDesc'>('createdDesc');
  readonly pageSizeOption = signal(10);

  readonly activeClientsCount = computed(() =>
    this.facade.clients().filter((client) => client.user?.isActive).length
  );

  readonly gstRegisteredCount = computed(() =>
    this.facade.clients().filter((client) => Boolean(client.gstin)).length
  );

  readonly workspaceYearsCount = computed(() =>
    this.facade.clients().reduce((total, client) => total + (client.years?.length || 0), 0)
  );

  @ViewChild(DataTableComponent) dataTable!: DataTableComponent;

  get tableColumns(): any[] {
    return [
      { name: 'Client', prop: 'user.name', sortable: false, width: 320, template: this.clientTpl() },
      { name: 'Primary Contact', prop: 'user.mobile', sortable: false, width: 240, template: this.contactTpl() },
      { name: 'Profile', prop: 'gstin', sortable: false, width: 260, template: this.profileTpl() },
      { name: 'Status', prop: 'user.isActive', sortable: false, width: 180, template: this.statusTpl() },
    ];
  }

  onAdd() {
    this.dataTable?.openModalWithType('add');
  }

  onEdit(row: Client) {
    this.dataTable?.openModalWithType('edit', row);
  }

  onDelete(client: Client) {
    if (confirm(`Are you sure you want to delete client ${client.code}?`)) {
      this.facade.deleteClient(client.id);
    }
  }

  onSortOptionChange(value: 'createdDesc' | 'updatedDesc' | 'codeAsc' | 'codeDesc') {
    this.sortOption.set(value);

    switch (value) {
      case 'updatedDesc':
        this.facade.updateSort('updatedAt', 'desc');
        break;
      case 'codeAsc':
        this.facade.updateSort('code', 'asc');
        break;
      case 'codeDesc':
        this.facade.updateSort('code', 'desc');
        break;
      default:
        this.facade.updateSort('createdAt', 'desc');
        break;
    }
  }

  onPageSizeChange(value: number) {
    const pageSize = Number(value) || 10;
    this.pageSizeOption.set(pageSize);
    this.facade.updatePageSize(pageSize);
  }

  getClientInitials(client: Client): string {
    const source = client.user?.name || client.businessName || client.code || 'Client';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'CL';
  }

  formatEntityType(entityType?: string | null): string {
    if (!entityType) return '';
    return entityType
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getRowClass = (row: Client) => {
    if (!row.user?.isActive) return 'border-danger';
    if (row.gstin) return 'border-success';
    return 'border-primary';
  };
}
