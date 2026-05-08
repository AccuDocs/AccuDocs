import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClientDeadlineAssignment, ComplianceDeadline } from '@core/services/compliance.service';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="calendar-panel">
      <div class="calendar-head grid grid-cols-7">
        @for (day of dayNames; track day) {
          <div class="day-name">{{ day }}</div>
        }
      </div>

      <div class="grid grid-cols-7">
        @for (cell of calendarCells(); track $index) {
          <div class="calendar-cell" [class.is-muted]="!cell.isCurrentMonth" [class.is-today]="cell.isToday">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="day-pill" [class.day-pill--today]="cell.isToday">{{ cell.day }}</span>
            </div>

            <div class="space-y-1.5">
              @for (deadline of cell.deadlines; track deadline.id; let index = $index) {
                @if (index < 3) {
                  <button type="button" class="deadline-chip" [ngClass]="chipClass(deadline.type)" (click)="deadlineClick.emit(deadline)">
                    <span class="chip-dot" [ngClass]="dotClass(deadline.type)"></span>
                    <span class="truncate">{{ deadline.title }}</span>
                    @if (getAssignedCount(deadline.id) > 0) {
                      <span class="chip-count">{{ getAssignedCount(deadline.id) }}</span>
                    }
                  </button>
                }
              }

              @if (cell.deadlines.length > 3) {
                <span class="more-chip">+{{ cell.deadlines.length - 3 }} more</span>
              }
            </div>
          </div>
        }
      </div>

      <div class="legend-row">
        @for (item of legendItems; track item.label) {
          <div class="legend-item">
            <span class="legend-dot" [ngClass]="item.dotClass"></span>
            <span>{{ item.label }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }
    .calendar-panel {
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid #dbe3ef;
      background: white;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .calendar-head {
      border-bottom: 1px solid #dbe3ef;
      background: #f8fafc;
    }
    .day-name {
      padding: 14px 12px;
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #64748b;
    }
    .calendar-cell {
      min-height: 132px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      padding: 10px;
      background: white;
    }
    .calendar-cell:nth-child(7n) {
      border-right: 0;
    }
    .calendar-cell.is-muted {
      background: #fbfdff;
      color: #94a3b8;
    }
    .calendar-cell.is-today {
      background: #f0f9ff;
    }
    .day-pill {
      display: inline-flex;
      height: 28px;
      min-width: 28px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }
    .day-pill--today {
      background: #0369a1;
      color: white;
    }
    .deadline-chip {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
      border-radius: 10px;
      border: 1px solid;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 800;
      text-align: left;
      transition: filter .16s ease;
    }
    .deadline-chip:hover {
      filter: brightness(0.98);
    }
    .chip-dot,
    .legend-dot {
      height: 8px;
      width: 8px;
      flex: 0 0 auto;
      border-radius: 999px;
    }
    .chip-count {
      margin-left: auto;
      display: inline-flex;
      min-width: 18px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.75);
      padding: 0 5px;
      font-size: 10px;
      font-weight: 900;
    }
    .more-chip {
      display: inline-flex;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 900;
      color: #64748b;
    }
    .legend-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      border-top: 1px solid #dbe3ef;
      padding: 14px 16px;
      background: #fcfdff;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }
    @media (max-width: 900px) {
      .calendar-cell {
        min-height: 108px;
        padding: 8px;
      }
      .day-name {
        padding: 12px 6px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarViewComponent {
  readonly deadlines = input<ComplianceDeadline[]>([]);
  readonly month = input(new Date().getMonth());
  readonly year = input(new Date().getFullYear());
  readonly clientDeadlines = input<ClientDeadlineAssignment[]>([]);

  readonly deadlineClick = output<ComplianceDeadline>();

  readonly dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly legendItems = [
    { label: 'GST', dotClass: 'bg-indigo-500' },
    { label: 'ITR', dotClass: 'bg-sky-600' },
    { label: 'TDS', dotClass: 'bg-amber-500' },
    { label: 'ROC', dotClass: 'bg-violet-500' },
    { label: 'Advance Tax', dotClass: 'bg-pink-500' },
    { label: 'Other', dotClass: 'bg-slate-500' },
  ];

  readonly calendarCells = computed(() => {
    const month = this.month();
    const year = this.year();
    const cells: { day: number; isCurrentMonth: boolean; isToday: boolean; deadlines: ComplianceDeadline[] }[] = [];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const isCurrentMonthYear = today.getMonth() === month && today.getFullYear() === year;

    const deadlineMap = new Map<string, ComplianceDeadline[]>();
    for (const deadline of this.deadlines()) {
      const dateKey = deadline.dueDate.split('T')[0];
      if (!deadlineMap.has(dateKey)) deadlineMap.set(dateKey, []);
      deadlineMap.get(dateKey)!.push(deadline);
    }

    for (let index = firstDay - 1; index >= 0; index--) {
      const day = daysInPrevMonth - index;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, isCurrentMonth: false, isToday: false, deadlines: deadlineMap.get(dateKey) || [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        isCurrentMonth: true,
        isToday: isCurrentMonthYear && today.getDate() === day,
        deadlines: deadlineMap.get(dateKey) || [],
      });
    }

    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateKey = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, isCurrentMonth: false, isToday: false, deadlines: deadlineMap.get(dateKey) || [] });
    }

    return cells;
  });

  getAssignedCount(deadlineId: string): number {
    return this.clientDeadlines().filter((deadline) => deadline.deadlineId === deadlineId).length;
  }

  chipClass(type: string): string {
    const classes: Record<string, string> = {
      GST: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      ITR: 'border-sky-200 bg-sky-50 text-sky-700',
      TDS: 'border-amber-200 bg-amber-50 text-amber-700',
      ROC: 'border-violet-200 bg-violet-50 text-violet-700',
      ADVANCE_TAX: 'border-pink-200 bg-pink-50 text-pink-700',
      OTHER: 'border-slate-200 bg-slate-50 text-slate-700',
    };
    return classes[type] || classes['OTHER'];
  }

  dotClass(type: string): string {
    const classes: Record<string, string> = {
      GST: 'bg-indigo-500',
      ITR: 'bg-sky-600',
      TDS: 'bg-amber-500',
      ROC: 'bg-violet-500',
      ADVANCE_TAX: 'bg-pink-500',
      OTHER: 'bg-slate-500',
    };
    return classes[type] || classes['OTHER'];
  }
}
