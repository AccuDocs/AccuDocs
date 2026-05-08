import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroCheckCircleSolid,
  heroClockSolid,
  heroExclamationTriangleSolid,
  heroUserGroupSolid,
} from '@ng-icons/heroicons/solid';

import { ClientDeadlineAssignment, ComplianceDeadline } from '@core/services/compliance.service';

@Component({
  selector: 'app-deadline-list',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroCheckCircleSolid,
      heroClockSolid,
      heroExclamationTriangleSolid,
      heroUserGroupSolid,
    }),
  ],
  template: `
    <article class="dashboard-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Deadline Queue</p>
          <h2 class="panel-title">Compliance Cards</h2>
        </div>
        <span class="panel-count">{{ sortedDeadlines().length }} template(s)</span>
      </header>

      <div class="cards-grid">
        @for (deadline of sortedDeadlines(); track deadline.id) {
          <article class="deadline-card" (click)="deadlineClick.emit(deadline)">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <div class="type-pill" [ngClass]="typeBadgeClass(deadline.type)">{{ typeLabel(deadline.type) }}</div>
                <div class="min-w-0">
                  <p class="card-eyebrow">Due {{ formatDate(deadline.dueDate) }}</p>
                  <span class="mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]" [ngClass]="countdownChipClass(deadline.dueDate)">
                    {{ countdownLabel(deadline.dueDate) }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="assign-button"
                (click)="$event.stopPropagation(); assignClick.emit(deadline)"
                title="Assign clients"
              >
                <ng-icon name="heroUserGroupSolid" size="16"></ng-icon>
              </button>
            </div>

            <div class="mt-4 min-w-0">
              <p class="truncate text-lg font-black text-slate-950">{{ deadline.title }}</p>

              @if (deadline.description) {
                <p class="mt-3 line-clamp-2 text-sm font-medium leading-6 text-slate-500">{{ deadline.description }}</p>
              } @else {
                <p class="mt-3 text-sm font-medium leading-6 text-slate-400">No description added for this compliance deadline.</p>
              }
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-2">
              @if (deadline.recurring) {
                <div class="meta-chip">
                  {{ recurringLabel(deadline.recurringPattern) }}
                </div>
              }
              <div class="meta-chip">
                {{ getAssignedClients(deadline.id).length }} client(s) assigned
              </div>
            </div>

            <div class="mt-5 border-t border-slate-100 pt-4">
              <div class="flex items-center justify-between gap-3">
                <p class="card-eyebrow">Assigned Clients</p>
                <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                  {{ getAssignedClients(deadline.id).length }}
                </span>
              </div>
              @if (getAssignedClients(deadline.id).length > 0) {
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (clientDeadline of getAssignedClients(deadline.id); track clientDeadline.id; let index = $index) {
                    @if (index < 4) {
                      <span class="status-chip" [ngClass]="statusChipClass(clientDeadline.status)">
                        <ng-icon [name]="statusIcon(clientDeadline.status)" size="12"></ng-icon>
                        {{ clientDeadline.client?.user?.name || clientDeadline.client?.code || 'Client' }}
                      </span>
                    }
                  }
                  @if (getAssignedClients(deadline.id).length > 4) {
                    <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      +{{ getAssignedClients(deadline.id).length - 4 }} more
                    </span>
                  }
                </div>
              } @else {
                <p class="mt-3 text-sm font-medium text-slate-500">No clients assigned yet.</p>
              }
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <p class="text-sm font-black text-slate-950">No deadlines found</p>
            <p class="text-xs font-medium text-slate-500">Try another type filter or add a new compliance deadline.</p>
          </div>
        }
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
    }
    .dashboard-panel {
      min-width: 0;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid #dbe3ef;
      background: white;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #dbe3ef;
      padding: 16px 18px;
    }
    .eyebrow,
    .card-eyebrow {
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .panel-title {
      margin-top: 2px;
      font-size: 16px;
      font-weight: 950;
      color: #0f172a;
    }
    .panel-count {
      border-radius: 999px;
      background: #f8fafc;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 900;
      color: #64748b;
    }
    .cards-grid {
      display: grid;
      gap: 12px;
      padding: 16px;
    }
    @media (min-width: 768px) {
      .cards-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 1280px) {
      .cards-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .deadline-card {
      min-width: 0;
      min-height: 236px;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      border: 1px solid #dbe3ef;
      padding: 16px;
      background: white;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      transition: background-color .16s ease, border-color .16s ease, transform .16s ease, box-shadow .16s ease;
      cursor: pointer;
    }
    .deadline-card:hover {
      border-color: #c7d2fe;
      background: #f8faff;
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    }
    .type-pill {
      display: inline-flex;
      min-width: 64px;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .meta-chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: #f8fafc;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
    }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 800;
    }
    .assign-button {
      display: grid;
      height: 40px;
      width: 40px;
      place-items: center;
      border-radius: 12px;
      border: 1px solid #dbe3ef;
      background: white;
      color: #0369a1;
      transition: background-color .16s ease, border-color .16s ease;
    }
    .assign-button:hover {
      border-color: #bfdbfe;
      background: #eff6ff;
    }
    .empty-state {
      grid-column: 1 / -1;
      display: grid;
      min-height: 260px;
      place-items: center;
      align-content: center;
      gap: 8px;
      border-radius: 16px;
      border: 1px dashed #dbe3ef;
      background: #fbfdff;
      padding: 24px;
      text-align: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeadlineListComponent {
  readonly deadlines = input<ComplianceDeadline[]>([]);
  readonly clientDeadlines = input<ClientDeadlineAssignment[]>([]);

  readonly deadlineClick = output<ComplianceDeadline>();
  readonly assignClick = output<ComplianceDeadline>();
  readonly statusChange = output<{ clientDeadlineId: string; status: string }>();

  readonly sortedDeadlines = computed(() =>
    [...this.deadlines()].sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
  );

  getAssignedClients(deadlineId: string): ClientDeadlineAssignment[] {
    return this.clientDeadlines().filter((clientDeadline) => clientDeadline.deadlineId === deadlineId);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      GST: 'GST',
      ITR: 'ITR',
      TDS: 'TDS',
      ROC: 'ROC',
      ADVANCE_TAX: 'ADV TAX',
      OTHER: 'OTHER',
    };
    return labels[type] || 'OTHER';
  }

  recurringLabel(pattern?: string): string {
    return pattern ? `Repeats ${pattern.toLowerCase()}` : 'Recurring';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  countdownLabel(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

    if (diff < 0) return `${Math.abs(diff)} day(s) overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff <= 7) return `${diff} day(s) left`;
    return `${diff} day(s) ahead`;
  }

  countdownChipClass(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

    if (diff < 0) return 'bg-rose-50 text-rose-700';
    if (diff <= 7) return 'bg-amber-50 text-amber-700';
    return 'bg-emerald-50 text-emerald-700';
  }

  typeBadgeClass(type: string): string {
    const classes: Record<string, string> = {
      GST: 'bg-indigo-50 text-indigo-700',
      ITR: 'bg-sky-50 text-sky-700',
      TDS: 'bg-amber-50 text-amber-700',
      ROC: 'bg-violet-50 text-violet-700',
      ADVANCE_TAX: 'bg-pink-50 text-pink-700',
      OTHER: 'bg-slate-100 text-slate-700',
    };
    return classes[type] || classes['OTHER'];
  }

  statusChipClass(status: string): string {
    const classes: Record<string, string> = {
      filed: 'bg-emerald-50 text-emerald-700',
      overdue: 'bg-rose-50 text-rose-700',
      pending: 'bg-amber-50 text-amber-700',
    };
    return classes[status] || 'bg-slate-100 text-slate-600';
  }

  statusIcon(status: string): string {
    const icons: Record<string, string> = {
      filed: 'heroCheckCircleSolid',
      overdue: 'heroExclamationTriangleSolid',
      pending: 'heroClockSolid',
    };
    return icons[status] || 'heroClockSolid';
  }
}
