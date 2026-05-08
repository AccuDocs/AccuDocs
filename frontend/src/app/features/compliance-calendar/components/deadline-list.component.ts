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
    <section class="list-panel">
      <div class="space-y-3 p-4">
        @for (deadline of sortedDeadlines(); track deadline.id) {
          <button type="button" class="deadline-row" [style.border-left-color]="typeAccent(deadline.type)" (click)="deadlineClick.emit(deadline)">
            <div class="flex min-w-0 items-start gap-3">
              <div class="type-badge" [ngClass]="typeBadgeClass(deadline.type)">
                {{ typeLabel(deadline.type) }}
              </div>

              <div class="min-w-0 flex-1 text-left">
                <p class="truncate text-sm font-black text-slate-950">{{ deadline.title }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    {{ formatDate(deadline.dueDate) }}
                  </span>
                  @if (deadline.recurring) {
                    <span class="text-[11px] font-semibold text-slate-500">{{ recurringLabel(deadline.recurringPattern) }}</span>
                  }
                  @if (deadline.description) {
                    <span class="truncate text-[11px] font-semibold text-slate-500">{{ deadline.description }}</span>
                  }
                </div>

                @if (getAssignedClients(deadline.id).length > 0) {
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (clientDeadline of getAssignedClients(deadline.id); track clientDeadline.id; let index = $index) {
                      @if (index < 5) {
                        <span class="status-chip" [ngClass]="statusChipClass(clientDeadline.status)">
                          <ng-icon [name]="statusIcon(clientDeadline.status)" size="12"></ng-icon>
                          {{ clientDeadline.client?.user?.name || clientDeadline.client?.code || 'Client' }}
                        </span>
                      }
                    }
                    @if (getAssignedClients(deadline.id).length > 5) {
                      <span class="text-[11px] font-black text-slate-500">+{{ getAssignedClients(deadline.id).length - 5 }} more</span>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="ml-3 flex shrink-0 items-center gap-3">
              <div class="text-right">
                <p class="text-xs font-black uppercase tracking-[0.14em]" [ngClass]="countdownColorClass(deadline.dueDate)">
                  {{ countdownLabel(deadline.dueDate) }}
                </p>
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
          </button>
        } @empty {
          <div class="empty-state">
            <p class="text-sm font-black text-slate-950">No deadlines found</p>
            <p class="text-xs font-medium text-slate-500">Try another type filter or add a new compliance deadline.</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
    .list-panel {
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid #dbe3ef;
      background: white;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .deadline-row {
      display: flex;
      width: 100%;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      padding: 16px;
      background: white;
      transition: background-color .16s ease, border-color .16s ease;
    }
    .deadline-row:hover {
      border-color: #cfe3f5;
      background: #f8fbff;
    }
    .type-badge {
      display: inline-flex;
      min-width: 58px;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      padding: 10px 8px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
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
      height: 38px;
      width: 38px;
      place-items: center;
      border-radius: 10px;
      background: #eff6ff;
      color: #0369a1;
      transition: background-color .16s ease;
    }
    .assign-button:hover {
      background: #dbeafe;
    }
    .empty-state {
      display: grid;
      min-height: 280px;
      place-items: center;
      align-content: center;
      gap: 8px;
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

  countdownColorClass(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

    if (diff < 0) return 'text-rose-700';
    if (diff <= 7) return 'text-amber-700';
    return 'text-emerald-700';
  }

  typeAccent(type: string): string {
    const colors: Record<string, string> = {
      GST: '#6366f1',
      ITR: '#0369a1',
      TDS: '#d97706',
      ROC: '#8b5cf6',
      ADVANCE_TAX: '#db2777',
      OTHER: '#64748b',
    };
    return colors[type] || colors['OTHER'];
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
