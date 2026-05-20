import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type PayrollView =
  | 'dashboard'
  | 'employees'
  | 'salary'
  | 'statutory'
  | 'tds'
  | 'payslips'
  | 'attendance'
  | 'bonus'
  | 'loans'
  | 'settings';

type PayrollForm = 'employee' | 'bonus' | 'loan';
type PayrollStatus = 'Draft' | 'Calculated' | 'Approved' | 'Paid';
type PayslipStatus = 'Pending' | 'Generated' | 'Delivered';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

interface MenuItem {
  id: PayrollView;
  label: string;
  icon: string;
}

interface MetricCard {
  label: string;
  value: string;
  helper: string;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate';
}

interface PayrollEmployee {
  id: string;
  code: string;
  name: string;
  department: string;
  designation: string;
  state: string;
  pan: string;
  uan: string;
  esic: string;
  bank: string;
  basic: number;
  hra: number;
  allowance: number;
  daysPayable: number;
  leaveDays: number;
  bonus: number;
  incentive: number;
  loanEmi: number;
  tdsMonthly: number;
  status: PayrollStatus;
  payslipStatus: PayslipStatus;
  form16Status: string;
}

interface AttendanceRow {
  date: string;
  present: number;
  absent: number;
  onLeave: number;
  overtimeHours: number;
  status: string;
}

interface LeaveRequest {
  ref: string;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
}

interface BonusRow {
  ref: string;
  employeeCode: string;
  employee: string;
  type: string;
  period: string;
  amount: number;
  status: string;
}

interface LoanRow {
  ref: string;
  employeeCode: string;
  employee: string;
  type: string;
  principal: number;
  balance: number;
  emi: number;
  nextRecovery: string;
  status: string;
}

interface TimelineItem {
  title: string;
  owner: string;
  status: string;
}

@Component({
  selector: 'app-payroll-hr',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <section class="payroll-shell">
      <header class="payroll-header">
        <div>
          <p class="eyebrow">Client payroll workspace</p>
          <h1>Payroll & HR</h1>
          <p>Salary processing, statutory deductions, TDS, payslips, leave, attendance, bonuses, loans, and HR dashboards for this client.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="primary-action" (click)="processPayroll()">
            <mat-icon>calculate</mat-icon>
            Process Payroll
          </button>
          <button type="button" (click)="generatePayslips()">
            <mat-icon>receipt_long</mat-icon>
            Payslips
          </button>
          <button type="button" (click)="exportCurrentView()">
            <mat-icon>file_download</mat-icon>
            Export
          </button>
        </div>
      </header>

      @if (actionMessage()) {
        <section class="action-banner" role="status" aria-live="polite">
          <mat-icon>{{ actionIcon() }}</mat-icon>
          <div>
            <strong>{{ actionTitle() }}</strong>
            <span>{{ actionMessage() }}</span>
          </div>
          <button type="button" class="icon-button" (click)="clearAction()" aria-label="Dismiss message">
            <mat-icon>close</mat-icon>
          </button>
        </section>
      }

      @if (activeForm(); as form) {
        <section class="data-form-panel" [attr.aria-label]="formTitle()">
          <div class="form-heading">
            <div>
              <span>Data entry</span>
              <h2>{{ formTitle() }}</h2>
              <p>{{ formSubtitle() }}</p>
            </div>
            <button type="button" class="icon-button" (click)="closeForm()" aria-label="Close data entry form">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form class="data-form" (ngSubmit)="submitActiveForm()" #payrollDataForm="ngForm">
            @if (form === 'employee') {
              <div class="form-grid">
                <label class="field">
                  <span>Employee code</span>
                  <input name="employeeCode" [(ngModel)]="employeeForm.code" required />
                </label>
                <label class="field">
                  <span>Employee name</span>
                  <input name="employeeName" [(ngModel)]="employeeForm.name" required />
                </label>
                <label class="field">
                  <span>Department</span>
                  <input name="department" [(ngModel)]="employeeForm.department" required />
                </label>
                <label class="field">
                  <span>Designation</span>
                  <input name="designation" [(ngModel)]="employeeForm.designation" required />
                </label>
                <label class="field">
                  <span>Work state</span>
                  <select name="workState" [(ngModel)]="employeeForm.state" required>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Gujarat">Gujarat</option>
                  </select>
                </label>
                <label class="field">
                  <span>PAN</span>
                  <input name="pan" [(ngModel)]="employeeForm.pan" required />
                </label>
                <label class="field">
                  <span>UAN</span>
                  <input name="uan" [(ngModel)]="employeeForm.uan" />
                </label>
                <label class="field">
                  <span>ESIC IP</span>
                  <input name="esic" [(ngModel)]="employeeForm.esic" />
                </label>
                <label class="field">
                  <span>Basic salary</span>
                  <input type="number" min="0" name="basicSalary" [(ngModel)]="employeeForm.basic" required />
                </label>
                <label class="field">
                  <span>HRA</span>
                  <input type="number" min="0" name="hra" [(ngModel)]="employeeForm.hra" required />
                </label>
                <label class="field">
                  <span>Allowance</span>
                  <input type="number" min="0" name="allowance" [(ngModel)]="employeeForm.allowance" required />
                </label>
                <label class="field">
                  <span>Monthly TDS</span>
                  <input type="number" min="0" name="monthlyTds" [(ngModel)]="employeeForm.tdsMonthly" required />
                </label>
              </div>
            } @else if (form === 'bonus') {
              <div class="form-grid">
                <label class="field">
                  <span>Employee</span>
                  <select name="bonusEmployee" [(ngModel)]="bonusForm.employeeCode" required>
                    @for (employee of employees; track employee.id) {
                      <option [value]="employee.code">{{ employee.name }} - {{ employee.code }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Type</span>
                  <select name="bonusType" [(ngModel)]="bonusForm.type" required>
                    <option value="Performance Bonus">Performance Bonus</option>
                    <option value="Sales Incentive">Sales Incentive</option>
                    <option value="Festival Bonus">Festival Bonus</option>
                    <option value="Retention Incentive">Retention Incentive</option>
                  </select>
                </label>
                <label class="field">
                  <span>Period</span>
                  <input name="bonusPeriod" [(ngModel)]="bonusForm.period" required />
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="bonusAmount" [(ngModel)]="bonusForm.amount" required />
                </label>
              </div>
            } @else if (form === 'loan') {
              <div class="form-grid">
                <label class="field">
                  <span>Employee</span>
                  <select name="loanEmployee" [(ngModel)]="loanForm.employeeCode" required>
                    @for (employee of employees; track employee.id) {
                      <option [value]="employee.code">{{ employee.name }} - {{ employee.code }}</option>
                    }
                  </select>
                </label>
                <label class="field">
                  <span>Type</span>
                  <select name="loanType" [(ngModel)]="loanForm.type" required>
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Employee Loan">Employee Loan</option>
                    <option value="Travel Advance">Travel Advance</option>
                  </select>
                </label>
                <label class="field">
                  <span>Principal</span>
                  <input type="number" min="0" name="loanPrincipal" [(ngModel)]="loanForm.principal" required />
                </label>
                <label class="field">
                  <span>Monthly EMI</span>
                  <input type="number" min="0" name="loanEmi" [(ngModel)]="loanForm.emi" required />
                </label>
              </div>
            }

            <div class="form-actions">
              <button type="submit" class="primary-action" [disabled]="payrollDataForm.invalid">
                <mat-icon>save</mat-icon>
                {{ formSubmitLabel() }}
              </button>
              <button type="button" class="small-action" (click)="closeForm()">
                <mat-icon>close</mat-icon>
                Cancel
              </button>
            </div>
          </form>
        </section>
      }

      <div class="payroll-layout">
        <aside class="payroll-menu" aria-label="Payroll menu">
          <h2>Payroll & HR</h2>
          @for (item of menuItems; track item.id) {
            <button type="button" [class.active]="activeView() === item.id" (click)="openView(item.id)">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </button>
          }
        </aside>

        <main class="payroll-content">
          @if (activeView() === 'dashboard') {
            <section class="metric-grid">
              @for (metric of dashboardMetrics(); track metric.label) {
                <article class="metric-card" [class]="metric.tone">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <small>{{ metric.helper }}</small>
                </article>
              }
            </section>

            <section class="content-grid two-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Payroll run</span>
                    <h2>{{ selectedPeriod }} processing status</h2>
                  </div>
                  <button type="button" class="small-action" (click)="openView('salary')">
                    <mat-icon>open_in_new</mat-icon>
                    Open
                  </button>
                </div>
                <div class="run-meter">
                  <div>
                    <strong>{{ processedCount() }} / {{ employees.length }}</strong>
                    <span>employees calculated</span>
                  </div>
                  <div class="meter-track" aria-label="Payroll progress">
                    <span [style.width.%]="payrollProgress()"></span>
                  </div>
                </div>
                <div class="timeline">
                  @for (item of payrollTimeline; track item.title) {
                    <div>
                      <mat-icon>{{ item.status === 'Done' ? 'check_circle' : item.status === 'Ready' ? 'radio_button_checked' : 'schedule' }}</mat-icon>
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.owner }}</span>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Statutory dues</span>
                    <h2>PF, ESI, PT, and TDS</h2>
                  </div>
                  <mat-icon>verified</mat-icon>
                </div>
                <div class="summary-list compact">
                  <div>
                    <span>Employee PF</span>
                    <strong>{{ totalPfEmployee() | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                  <div>
                    <span>Employer PF</span>
                    <strong>{{ totalPfEmployer() | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                  <div>
                    <span>ESI payable</span>
                    <strong>{{ totalEsiPayable() | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                  <div>
                    <span>PT + TDS</span>
                    <strong>{{ totalPt() + totalTds() | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Leave and attendance</span>
                    <h2>Current month snapshot</h2>
                  </div>
                  <button type="button" class="small-action" (click)="openView('attendance')">
                    <mat-icon>calendar_month</mat-icon>
                    Review
                  </button>
                </div>
                <div class="attendance-bars">
                  @for (row of attendanceRows; track row.date) {
                    <div>
                      <span>{{ row.date | date:'MMM d' }}</span>
                      <div class="attendance-track">
                        <b class="present" [style.width.%]="attendancePercent(row.present)"></b>
                        <b class="leave" [style.width.%]="attendancePercent(row.onLeave)"></b>
                        <b class="absent" [style.width.%]="attendancePercent(row.absent)"></b>
                      </div>
                      <strong>{{ row.status }}</strong>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>HR checklist</span>
                    <h2>Operational readiness</h2>
                  </div>
                  <mat-icon>assignment_turned_in</mat-icon>
                </div>
                <div class="check-grid">
                  @for (item of readinessItems; track item.label) {
                    <div>
                      <mat-icon>{{ item.ready ? 'check_circle' : 'pending_actions' }}</mat-icon>
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'employees') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Employee master</span>
                  <h2>Salary structures and statutory IDs</h2>
                </div>
                <button type="button" class="small-action" (click)="addEmployee()">
                  <mat-icon>person_add</mat-icon>
                  Employee
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>PAN</th>
                      <th>UAN</th>
                      <th>ESIC</th>
                      <th class="right">Gross</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (employee of employees; track employee.id) {
                      <tr>
                        <td>
                          <strong>{{ employee.name }}</strong>
                          <small>{{ employee.code }} - {{ employee.designation }}</small>
                        </td>
                        <td>{{ employee.department }}</td>
                        <td>{{ employee.pan }}</td>
                        <td>{{ employee.uan || '-' }}</td>
                        <td>{{ employee.esic || '-' }}</td>
                        <td class="right">{{ grossSalary(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td><span class="status-pill">{{ employee.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'salary') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Employee salary processing</span>
                  <h2>{{ selectedPeriod }} payroll register</h2>
                </div>
                <div class="filter-row">
                  <select [(ngModel)]="selectedPeriod" aria-label="Payroll period">
                    @for (period of payrollPeriods; track period) {
                      <option [value]="period">{{ period }}</option>
                    }
                  </select>
                  <button type="button" class="small-action" (click)="processPayroll()">
                    <mat-icon>calculate</mat-icon>
                    Calculate
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th class="right">Earnings</th>
                      <th class="right">PF</th>
                      <th class="right">ESI</th>
                      <th class="right">PT</th>
                      <th class="right">TDS</th>
                      <th class="right">Loan</th>
                      <th class="right">Net Pay</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (employee of employees; track employee.id) {
                      <tr>
                        <td>
                          <strong>{{ employee.name }}</strong>
                          <small>{{ employee.daysPayable }} payable days</small>
                        </td>
                        <td class="right">{{ grossSalary(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ pfEmployee(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ esiEmployee(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ professionalTax(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ employee.tdsMonthly | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ employee.loanEmi | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right strong">{{ netPay(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td><span class="status-pill">{{ employee.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'statutory') {
            <section class="content-grid one-one">
              @for (card of statutoryCards(); track card.label) {
                <article class="statutory-card">
                  <mat-icon>{{ card.icon }}</mat-icon>
                  <span>{{ card.label }}</span>
                  <strong>{{ card.value }}</strong>
                  <small>{{ card.helper }}</small>
                </article>
              }
            </section>

            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>PF, ESI, PT auto-calculation</span>
                  <h2>Employee-wise statutory split</h2>
                </div>
                <button type="button" class="small-action" (click)="processPayroll()">
                  <mat-icon>sync</mat-icon>
                  Recalculate
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>State</th>
                      <th class="right">PF Employee</th>
                      <th class="right">PF Employer</th>
                      <th class="right">ESI Employee</th>
                      <th class="right">ESI Employer</th>
                      <th class="right">PT</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (employee of employees; track employee.id) {
                      <tr>
                        <td><strong>{{ employee.name }}</strong></td>
                        <td>{{ employee.state }}</td>
                        <td class="right">{{ pfEmployee(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ pfEmployer(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ esiEmployee(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ esiEmployer(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ professionalTax(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'tds') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>TDS on salary</span>
                  <h2>Form 16 preparation</h2>
                </div>
                <button type="button" class="small-action" (click)="prepareAllForm16()">
                  <mat-icon>description</mat-icon>
                  Prepare Form 16
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>PAN</th>
                      <th class="right">Annual Gross</th>
                      <th class="right">Annual TDS</th>
                      <th>Form 16</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (employee of employees; track employee.id) {
                      <tr>
                        <td><strong>{{ employee.name }}</strong></td>
                        <td>{{ employee.pan }}</td>
                        <td class="right">{{ annualGross(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ employee.tdsMonthly * 12 | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td><span class="status-pill">{{ employee.form16Status }}</span></td>
                        <td class="right">
                          <button type="button" class="icon-button" (click)="prepareForm16(employee)" aria-label="Prepare Form 16">
                            <mat-icon>description</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'payslips') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Payslip generation and delivery</span>
                  <h2>Employee payslip queue</h2>
                </div>
                <div class="header-actions">
                  <button type="button" class="small-action" (click)="generatePayslips()">
                    <mat-icon>receipt_long</mat-icon>
                    Generate
                  </button>
                  <button type="button" class="small-action" (click)="deliverPayslips()">
                    <mat-icon>send</mat-icon>
                    Deliver
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Bank</th>
                      <th class="right">Net Pay</th>
                      <th>Status</th>
                      <th>Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (employee of employees; track employee.id) {
                      <tr>
                        <td><strong>{{ employee.name }}</strong></td>
                        <td>{{ employee.bank }}</td>
                        <td class="right">{{ netPay(employee) | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td><span class="status-pill">{{ employee.payslipStatus }}</span></td>
                        <td>
                          <button type="button" class="small-action" (click)="deliverPayslip(employee)">
                            <mat-icon>mail</mat-icon>
                            Send
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'attendance') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Attendance management</span>
                    <h2>Daily attendance summary</h2>
                  </div>
                  <button type="button" class="small-action" (click)="syncAttendance()">
                    <mat-icon>sync</mat-icon>
                    Sync
                  </button>
                </div>
                <div class="table-wrap compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th class="right">Present</th>
                        <th class="right">Leave</th>
                        <th class="right">Absent</th>
                        <th class="right">OT Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of attendanceRows; track row.date) {
                        <tr>
                          <td>{{ row.date | date:'MMM d, y' }}</td>
                          <td class="right">{{ row.present }}</td>
                          <td class="right">{{ row.onLeave }}</td>
                          <td class="right">{{ row.absent }}</td>
                          <td class="right">{{ row.overtimeHours }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Leave management</span>
                    <h2>Approvals and balances</h2>
                  </div>
                  <mat-icon>event_available</mat-icon>
                </div>
                <div class="leave-list">
                  @for (leave of leaveRequests; track leave.ref) {
                    <div>
                      <span>{{ leave.ref }}</span>
                      <strong>{{ leave.employee }}</strong>
                      <small>{{ leave.type }} - {{ leave.days }} day(s)</small>
                      <button type="button" class="small-action" (click)="approveLeave(leave.ref)">
                        <mat-icon>check</mat-icon>
                        {{ leave.status }}
                      </button>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'bonus') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Bonus and incentive management</span>
                  <h2>Variable pay register</h2>
                </div>
                <button type="button" class="small-action" (click)="addBonus()">
                  <mat-icon>add</mat-icon>
                  Bonus
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Period</th>
                      <th class="right">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (bonus of bonusRows; track bonus.ref) {
                      <tr>
                        <td>{{ bonus.ref }}</td>
                        <td><strong>{{ bonus.employee }}</strong></td>
                        <td>{{ bonus.type }}</td>
                        <td>{{ bonus.period }}</td>
                        <td class="right">{{ bonus.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td><span class="status-pill">{{ bonus.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'loans') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Loan and advance tracking</span>
                  <h2>Recoveries linked to payroll</h2>
                </div>
                <div class="header-actions">
                  <button type="button" class="small-action" (click)="addLoan()">
                    <mat-icon>add_card</mat-icon>
                    Advance
                  </button>
                  <button type="button" class="small-action" (click)="recordLoanRecovery()">
                    <mat-icon>payments</mat-icon>
                    Recover EMI
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Employee</th>
                      <th>Type</th>
                      <th class="right">Principal</th>
                      <th class="right">Balance</th>
                      <th class="right">EMI</th>
                      <th>Next recovery</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (loan of loanRows; track loan.ref) {
                      <tr>
                        <td>{{ loan.ref }}</td>
                        <td><strong>{{ loan.employee }}</strong></td>
                        <td>{{ loan.type }}</td>
                        <td class="right">{{ loan.principal | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ loan.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ loan.emi | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td>{{ loan.nextRecovery }}</td>
                        <td><span class="status-pill">{{ loan.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'settings') {
            <section class="content-grid group-grid">
              @for (setting of payrollSettings; track setting.label) {
                <article class="mini-card">
                  <mat-icon>{{ setting.icon }}</mat-icon>
                  <span>{{ setting.label }}</span>
                  <strong>{{ setting.value }}</strong>
                  <small>{{ setting.helper }}</small>
                </article>
              }
            </section>
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Payroll controls</span>
                  <h2>Maker-checker, delivery, and compliance settings</h2>
                </div>
                <button type="button" class="small-action" (click)="saveSettings()">
                  <mat-icon>save</mat-icon>
                  Save
                </button>
              </div>
              <div class="check-grid">
                @for (item of controlItems; track item.label) {
                  <div>
                    <mat-icon>{{ item.icon }}</mat-icon>
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                }
              </div>
            </section>
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }

    .payroll-shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 100%;
      padding: 4px 0 24px;
      color: rgb(15 23 42);
    }

    .payroll-header,
    .payroll-menu,
    .panel,
    .metric-card,
    .statutory-card,
    .mini-card,
    .data-form-panel {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
    }

    :host-context(.dark) .payroll-shell {
      color: rgb(226 232 240);
    }

    :host-context(.dark) .payroll-header,
    :host-context(.dark) .payroll-menu,
    :host-context(.dark) .panel,
    :host-context(.dark) .metric-card,
    :host-context(.dark) .statutory-card,
    :host-context(.dark) .mini-card,
    :host-context(.dark) .data-form-panel {
      border-color: rgb(30 41 59);
      background: rgb(15 23 42);
    }

    .payroll-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
    }

    .eyebrow,
    .panel-header span,
    .payroll-menu h2,
    .field span {
      margin: 0 0 4px;
      color: rgb(100 116 139);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .payroll-header h1,
    .panel-header h2,
    .form-heading h2,
    .mini-card strong,
    .statutory-card strong,
    .metric-card strong {
      margin: 0;
      color: rgb(15 23 42);
      font-weight: 850;
    }

    :host-context(.dark) .payroll-header h1,
    :host-context(.dark) .panel-header h2,
    :host-context(.dark) .form-heading h2,
    :host-context(.dark) td strong,
    :host-context(.dark) .mini-card strong,
    :host-context(.dark) .statutory-card strong,
    :host-context(.dark) .metric-card strong,
    :host-context(.dark) .summary-list strong {
      color: white;
    }

    .payroll-header h1 {
      font-size: 28px;
      line-height: 1.12;
    }

    .payroll-header p,
    .form-heading p,
    .mini-card small,
    .statutory-card small {
      margin: 6px 0 0;
      color: rgb(100 116 139);
      font-size: 14px;
      line-height: 1.5;
    }

    .header-actions,
    .form-actions,
    .filter-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    button {
      font: inherit;
    }

    .header-actions button,
    .primary-action,
    .small-action,
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 38px;
      border: 1px solid rgb(203 213 225);
      border-radius: 8px;
      background: white;
      color: rgb(15 23 42);
      padding: 0 12px;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
    }

    .primary-action {
      border-color: rgb(37 99 235);
      background: rgb(37 99 235);
      color: white;
    }

    .primary-action:disabled {
      border-color: rgb(148 163 184);
      background: rgb(148 163 184);
      cursor: not-allowed;
      opacity: 0.75;
    }

    .icon-button {
      width: 38px;
      padding: 0;
    }

    :host-context(.dark) .header-actions button,
    :host-context(.dark) .small-action,
    :host-context(.dark) .icon-button {
      border-color: rgb(51 65 85);
      background: rgb(15 23 42);
      color: rgb(226 232 240);
    }

    .action-banner {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      border: 1px solid rgb(191 219 254);
      border-radius: 8px;
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      padding: 12px;
    }

    .action-banner div {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .action-banner strong {
      font-size: 13px;
    }

    .action-banner span {
      font-size: 13px;
      line-height: 1.4;
    }

    .data-form-panel {
      padding: 18px;
    }

    .form-heading,
    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
    }

    .data-form {
      display: grid;
      gap: 14px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .field {
      display: grid;
      gap: 6px;
      min-width: 0;
    }

    input,
    select {
      min-height: 38px;
      width: 100%;
      border: 1px solid rgb(203 213 225);
      border-radius: 8px;
      background: white;
      color: rgb(15 23 42);
      padding: 0 10px;
      font-size: 13px;
      outline: none;
    }

    input:focus,
    select:focus {
      border-color: rgb(37 99 235);
      box-shadow: 0 0 0 3px rgb(191 219 254);
    }

    :host-context(.dark) input,
    :host-context(.dark) select {
      border-color: rgb(51 65 85);
      background: rgb(2 6 23);
      color: white;
    }

    .payroll-layout {
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .payroll-menu {
      position: sticky;
      top: 0;
      display: grid;
      gap: 6px;
      padding: 14px;
    }

    .payroll-menu button {
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: rgb(71 85 105);
      padding: 10px;
      text-align: left;
      cursor: pointer;
    }

    .payroll-menu button.active {
      border-color: rgb(191 219 254);
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      font-weight: 800;
    }

    :host-context(.dark) .payroll-menu button {
      color: rgb(148 163 184);
    }

    :host-context(.dark) .payroll-menu button.active {
      border-color: rgb(30 64 175);
      background: rgb(30 41 59);
      color: rgb(147 197 253);
    }

    .payroll-content {
      display: grid;
      gap: 16px;
      min-width: 0;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .metric-card {
      display: grid;
      gap: 8px;
      min-height: 118px;
      padding: 16px;
    }

    .metric-card span,
    .metric-card small {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 750;
      line-height: 1.35;
    }

    .metric-card strong {
      font-size: 23px;
      line-height: 1.1;
    }

    .metric-card.green {
      border-color: rgb(187 247 208);
      background: rgb(240 253 244);
    }

    .metric-card.blue {
      border-color: rgb(191 219 254);
      background: rgb(239 246 255);
    }

    .metric-card.amber {
      border-color: rgb(253 230 138);
      background: rgb(255 251 235);
    }

    .metric-card.rose {
      border-color: rgb(254 205 211);
      background: rgb(255 241 242);
    }

    .metric-card.slate {
      border-color: rgb(203 213 225);
      background: rgb(248 250 252);
    }

    .content-grid {
      display: grid;
      gap: 16px;
    }

    .content-grid.two-one {
      grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
    }

    .content-grid.one-one,
    .content-grid.group-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .content-grid.group-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .panel {
      min-width: 0;
      padding: 18px;
    }

    .run-meter {
      display: grid;
      gap: 10px;
      margin-bottom: 16px;
    }

    .run-meter > div:first-child {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      color: rgb(100 116 139);
      font-size: 13px;
      font-weight: 750;
    }

    .run-meter strong {
      color: rgb(15 23 42);
      font-size: 24px;
    }

    .meter-track,
    .attendance-track {
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: rgb(226 232 240);
    }

    .meter-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, rgb(37 99 235), rgb(16 185 129));
    }

    .timeline,
    .summary-list,
    .check-grid,
    .leave-list,
    .attendance-bars {
      display: grid;
      gap: 10px;
    }

    .timeline div,
    .summary-list div,
    .check-grid div,
    .leave-list div {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      padding: 10px;
    }

    .timeline strong,
    .check-grid strong,
    .leave-list strong {
      color: rgb(15 23 42);
      font-size: 13px;
      font-weight: 850;
    }

    .timeline span,
    .summary-list span,
    .check-grid span,
    .leave-list span,
    .leave-list small {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 700;
    }

    .summary-list.compact div {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .attendance-bars > div {
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr) 90px;
      align-items: center;
      gap: 10px;
    }

    .attendance-bars span,
    .attendance-bars strong {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 750;
    }

    .attendance-track {
      display: flex;
      background: rgb(241 245 249);
    }

    .attendance-track b {
      display: block;
      height: 100%;
    }

    .attendance-track .present {
      background: rgb(34 197 94);
    }

    .attendance-track .leave {
      background: rgb(245 158 11);
    }

    .attendance-track .absent {
      background: rgb(244 63 94);
    }

    .statutory-card,
    .mini-card {
      display: grid;
      gap: 8px;
      padding: 16px;
      min-height: 128px;
    }

    .statutory-card mat-icon,
    .mini-card mat-icon {
      color: rgb(37 99 235);
    }

    .statutory-card span,
    .mini-card span {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 800;
    }

    .statutory-card strong,
    .mini-card strong {
      font-size: 20px;
      line-height: 1.15;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
    }

    .compact-table table {
      min-width: 520px;
    }

    th,
    td {
      border-bottom: 1px solid rgb(226 232 240);
      padding: 11px 10px;
      text-align: left;
      vertical-align: middle;
      white-space: nowrap;
    }

    th {
      color: rgb(100 116 139);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }

    td {
      color: rgb(51 65 85);
      font-size: 13px;
      font-weight: 650;
    }

    td small {
      display: block;
      margin-top: 3px;
      color: rgb(100 116 139);
      font-size: 11px;
      font-weight: 650;
    }

    .right {
      text-align: right;
    }

    .strong {
      color: rgb(21 128 61);
      font-weight: 900;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      background: rgb(241 245 249);
      color: rgb(51 65 85);
      padding: 0 10px;
      font-size: 11px;
      font-weight: 850;
    }

    @media (max-width: 1200px) {
      .payroll-layout,
      .content-grid.two-one,
      .content-grid.one-one,
      .content-grid.group-grid {
        grid-template-columns: 1fr;
      }

      .payroll-menu {
        position: static;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .payroll-menu h2 {
        grid-column: 1 / -1;
      }

      .metric-grid,
      .form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 700px) {
      .payroll-header,
      .form-heading,
      .panel-header {
        flex-direction: column;
      }

      .header-actions,
      .form-actions,
      .filter-row {
        justify-content: flex-start;
      }

      .metric-grid,
      .form-grid,
      .payroll-menu {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class PayrollHrComponent {
  clientId = input<string>('');

  activeView = signal<PayrollView>('dashboard');
  activeForm = signal<PayrollForm | null>(null);
  actionTitle = signal('');
  actionMessage = signal('');
  actionIcon = signal('check_circle');

  selectedPeriod = 'May 2026';
  payrollPeriods = ['May 2026', 'April 2026', 'March 2026', 'February 2026'];

  menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'HR Dashboard', icon: 'dashboard' },
    { id: 'employees', label: 'Employees', icon: 'groups' },
    { id: 'salary', label: 'Salary Processing', icon: 'calculate' },
    { id: 'statutory', label: 'PF, ESI, PT', icon: 'verified' },
    { id: 'tds', label: 'TDS & Form 16', icon: 'description' },
    { id: 'payslips', label: 'Payslips', icon: 'receipt_long' },
    { id: 'attendance', label: 'Leave & Attendance', icon: 'calendar_month' },
    { id: 'bonus', label: 'Bonus & Incentives', icon: 'workspace_premium' },
    { id: 'loans', label: 'Loans & Advances', icon: 'payments' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  employees: PayrollEmployee[] = [
    {
      id: 'emp-001',
      code: 'EMP-001',
      name: 'Aarav Mehta',
      department: 'Operations',
      designation: 'Operations Manager',
      state: 'Maharashtra',
      pan: 'AQLPM2458K',
      uan: '100458762389',
      esic: '',
      bank: 'HDFC Bank',
      basic: 52000,
      hra: 26000,
      allowance: 18000,
      daysPayable: 30,
      leaveDays: 0,
      bonus: 0,
      incentive: 12000,
      loanEmi: 5000,
      tdsMonthly: 7200,
      status: 'Calculated',
      payslipStatus: 'Generated',
      form16Status: 'Draft ready',
    },
    {
      id: 'emp-002',
      code: 'EMP-002',
      name: 'Diya Shah',
      department: 'Sales',
      designation: 'Sales Executive',
      state: 'Gujarat',
      pan: 'BZXPS4881Q',
      uan: '100458762390',
      esic: '',
      bank: 'ICICI Bank',
      basic: 26000,
      hra: 13000,
      allowance: 9000,
      daysPayable: 29,
      leaveDays: 1,
      bonus: 8000,
      incentive: 18000,
      loanEmi: 0,
      tdsMonthly: 2100,
      status: 'Calculated',
      payslipStatus: 'Pending',
      form16Status: 'Pending review',
    },
    {
      id: 'emp-003',
      code: 'EMP-003',
      name: 'Kabir Rao',
      department: 'Support',
      designation: 'Support Associate',
      state: 'Karnataka',
      pan: 'CMWPR7190N',
      uan: '100458762391',
      esic: 'ESI-782331',
      bank: 'Axis Bank',
      basic: 11500,
      hra: 5750,
      allowance: 2800,
      daysPayable: 30,
      leaveDays: 0,
      bonus: 0,
      incentive: 0,
      loanEmi: 1500,
      tdsMonthly: 0,
      status: 'Draft',
      payslipStatus: 'Pending',
      form16Status: 'Not applicable',
    },
    {
      id: 'emp-004',
      code: 'EMP-004',
      name: 'Meera Iyer',
      department: 'Finance',
      designation: 'Accounts Lead',
      state: 'Maharashtra',
      pan: 'DEKPI6134H',
      uan: '100458762392',
      esic: '',
      bank: 'Kotak Bank',
      basic: 42000,
      hra: 21000,
      allowance: 14000,
      daysPayable: 30,
      leaveDays: 0,
      bonus: 10000,
      incentive: 0,
      loanEmi: 3000,
      tdsMonthly: 4800,
      status: 'Approved',
      payslipStatus: 'Delivered',
      form16Status: 'Generated',
    },
  ];

  attendanceRows: AttendanceRow[] = [
    { date: '2026-05-17', present: 31, absent: 1, onLeave: 2, overtimeHours: 14, status: 'Synced' },
    { date: '2026-05-18', present: 32, absent: 0, onLeave: 2, overtimeHours: 9, status: 'Synced' },
    { date: '2026-05-19', present: 30, absent: 2, onLeave: 2, overtimeHours: 11, status: 'Needs review' },
    { date: '2026-05-20', present: 33, absent: 0, onLeave: 1, overtimeHours: 6, status: 'Live' },
  ];

  leaveRequests: LeaveRequest[] = [
    { ref: 'LV-2101', employee: 'Diya Shah', type: 'Casual Leave', from: '2026-05-12', to: '2026-05-12', days: 1, status: 'Approved' },
    { ref: 'LV-2102', employee: 'Kabir Rao', type: 'Sick Leave', from: '2026-05-21', to: '2026-05-22', days: 2, status: 'Pending' },
    { ref: 'LV-2103', employee: 'Aarav Mehta', type: 'Earned Leave', from: '2026-05-27', to: '2026-05-28', days: 2, status: 'Pending' },
  ];

  bonusRows: BonusRow[] = [
    { ref: 'BON-9001', employeeCode: 'EMP-002', employee: 'Diya Shah', type: 'Sales Incentive', period: 'May 2026', amount: 18000, status: 'Included in payroll' },
    { ref: 'BON-9002', employeeCode: 'EMP-004', employee: 'Meera Iyer', type: 'Performance Bonus', period: 'May 2026', amount: 10000, status: 'Approved' },
    { ref: 'BON-9003', employeeCode: 'EMP-003', employee: 'Kabir Rao', type: 'Festival Bonus', period: 'May 2026', amount: 2500, status: 'Draft' },
  ];

  loanRows: LoanRow[] = [
    { ref: 'ADV-7101', employeeCode: 'EMP-001', employee: 'Aarav Mehta', type: 'Employee Loan', principal: 60000, balance: 35000, emi: 5000, nextRecovery: 'May payroll', status: 'Active' },
    { ref: 'ADV-7102', employeeCode: 'EMP-004', employee: 'Meera Iyer', type: 'Salary Advance', principal: 24000, balance: 9000, emi: 3000, nextRecovery: 'May payroll', status: 'Active' },
    { ref: 'ADV-7103', employeeCode: 'EMP-003', employee: 'Kabir Rao', type: 'Travel Advance', principal: 12000, balance: 4500, emi: 1500, nextRecovery: 'May payroll', status: 'Active' },
  ];

  payrollTimeline: TimelineItem[] = [
    { title: 'Attendance lock', owner: 'HR team', status: 'Done' },
    { title: 'Salary calculation', owner: 'Payroll maker', status: 'Ready' },
    { title: 'Approver review', owner: 'Finance head', status: 'Pending' },
    { title: 'Bank advice', owner: 'Treasury', status: 'Pending' },
  ];

  readinessItems = [
    { label: 'Salary structures', value: '4 active', ready: true },
    { label: 'PF UAN records', value: '4 mapped', ready: true },
    { label: 'ESI eligibility', value: '1 eligible', ready: true },
    { label: 'Bank details', value: '4 verified', ready: true },
    { label: 'Leave approvals', value: '2 pending', ready: false },
    { label: 'Payslip delivery', value: '2 pending', ready: false },
  ];

  payrollSettings = [
    { label: 'PF rule', value: '12% with cap', helper: 'Employee and employer split', icon: 'account_balance' },
    { label: 'ESI rule', value: 'Gross <= INR 21,000', helper: 'Employee 0.75%, employer 3.25%', icon: 'health_and_safety' },
    { label: 'Professional tax', value: 'State-wise slabs', helper: 'Maharashtra, Karnataka, Gujarat, Delhi', icon: 'location_city' },
    { label: 'TDS cycle', value: 'Monthly', helper: 'Annual Form 16 ready from payroll data', icon: 'description' },
  ];

  controlItems = [
    { label: 'Payroll approval', value: 'Maker-checker enabled', icon: 'rule' },
    { label: 'Payslip channel', value: 'Email and WhatsApp', icon: 'send' },
    { label: 'Bank advice', value: 'CSV export enabled', icon: 'account_balance' },
    { label: 'Audit log', value: 'Every run is recorded', icon: 'history' },
  ];

  employeeForm: PayrollEmployee = {
    id: '',
    code: 'EMP-005',
    name: '',
    department: 'Operations',
    designation: '',
    state: 'Maharashtra',
    pan: '',
    uan: '',
    esic: '',
    bank: 'Bank account pending',
    basic: 25000,
    hra: 12500,
    allowance: 7500,
    daysPayable: 30,
    leaveDays: 0,
    bonus: 0,
    incentive: 0,
    loanEmi: 0,
    tdsMonthly: 0,
    status: 'Draft',
    payslipStatus: 'Pending',
    form16Status: 'Pending review',
  };

  bonusForm = {
    employeeCode: 'EMP-001',
    type: 'Performance Bonus',
    period: 'May 2026',
    amount: 5000,
  };

  loanForm = {
    employeeCode: 'EMP-001',
    type: 'Salary Advance',
    principal: 15000,
    emi: 2500,
  };

  private employeeSequence = 5;
  private bonusSequence = 9003;
  private loanSequence = 7103;

  dashboardMetrics(): MetricCard[] {
    return [
      { label: 'Employees', value: String(this.employees.length), helper: `${this.processedCount()} ready for payroll`, tone: 'blue' },
      { label: 'Gross Payroll', value: this.money(this.totalGross()), helper: this.selectedPeriod, tone: 'green' },
      { label: 'Net Payout', value: this.money(this.totalNetPay()), helper: 'After deductions', tone: 'slate' },
      { label: 'Statutory Dues', value: this.money(this.totalStatutoryDues()), helper: 'PF, ESI, PT, TDS', tone: 'amber' },
      { label: 'TDS Salary', value: this.money(this.totalTds()), helper: 'Monthly deduction', tone: 'rose' },
      { label: 'Payslips', value: `${this.deliveredPayslips()} sent`, helper: `${this.employees.length - this.deliveredPayslips()} remaining`, tone: 'blue' },
      { label: 'Leaves', value: `${this.pendingLeaves()} pending`, helper: 'Approvals open', tone: 'amber' },
      { label: 'Loans', value: this.money(this.totalLoanBalance()), helper: 'Open balance', tone: 'rose' },
    ];
  }

  statutoryCards(): Array<{ label: string; value: string; helper: string; icon: string }> {
    return [
      { label: 'Provident Fund', value: this.money(this.totalPfEmployee() + this.totalPfEmployer()), helper: 'Employee + employer contribution', icon: 'account_balance' },
      { label: 'ESI payable', value: this.money(this.totalEsiPayable()), helper: 'Employees under wage threshold', icon: 'health_and_safety' },
      { label: 'Professional Tax', value: this.money(this.totalPt()), helper: 'State-wise auto calculation', icon: 'location_city' },
      { label: 'TDS on Salary', value: this.money(this.totalTds()), helper: 'Mapped to Form 16', icon: 'description' },
    ];
  }

  openView(view: PayrollView): void {
    this.activeView.set(view);
    this.activeForm.set(null);
    this.announce('Section opened', `${this.labelForView(view)} is ready.`);
  }

  openForm(form: PayrollForm): void {
    this.activeForm.set(form);
    this.activeView.set(this.viewForForm(form));
    this.announce('Data entry opened', `${this.formTitle()} is ready.`, 'edit_note');
  }

  closeForm(): void {
    this.activeForm.set(null);
  }

  clearAction(): void {
    this.actionTitle.set('');
    this.actionMessage.set('');
    this.actionIcon.set('check_circle');
  }

  submitActiveForm(): void {
    switch (this.activeForm()) {
      case 'employee':
        this.submitEmployee();
        break;
      case 'bonus':
        this.submitBonus();
        break;
      case 'loan':
        this.submitLoan();
        break;
      default:
        break;
    }
  }

  addEmployee(): void {
    this.openForm('employee');
  }

  addBonus(): void {
    this.openForm('bonus');
  }

  addLoan(): void {
    this.openForm('loan');
  }

  submitEmployee(): void {
    const id = `emp-${String(this.employeeSequence).padStart(3, '0')}`;
    const code = this.text(this.employeeForm.code, `EMP-${String(this.employeeSequence).padStart(3, '0')}`);
    const employee: PayrollEmployee = {
      ...this.employeeForm,
      id,
      code,
      name: this.text(this.employeeForm.name, `New Employee ${this.employeeSequence}`),
      department: this.text(this.employeeForm.department, 'Operations'),
      designation: this.text(this.employeeForm.designation, 'Team Member'),
      pan: this.text(this.employeeForm.pan, 'PANPENDING'),
      status: 'Draft',
      payslipStatus: 'Pending',
      form16Status: Number(this.employeeForm.tdsMonthly) > 0 ? 'Pending review' : 'Not applicable',
    };

    this.employees = [employee, ...this.employees];
    this.employeeSequence += 1;
    this.resetEmployeeForm();
    this.activeView.set('employees');
    this.closeForm();
    this.announce('Employee saved', `${employee.code} was added to the payroll master.`, 'person_add');
  }

  submitBonus(): void {
    const employee = this.employeeByCode(this.bonusForm.employeeCode);
    const ref = `BON-${this.bonusSequence + 1}`;
    this.bonusSequence += 1;

    this.bonusRows = [
      {
        ref,
        employeeCode: this.bonusForm.employeeCode,
        employee: employee?.name ?? 'Employee',
        type: this.text(this.bonusForm.type, 'Performance Bonus'),
        period: this.text(this.bonusForm.period, this.selectedPeriod),
        amount: this.amountValue(this.bonusForm.amount),
        status: 'Draft',
      },
      ...this.bonusRows,
    ];

    if (employee) {
      this.employees = this.employees.map((item) => item.code === employee.code ? { ...item, bonus: item.bonus + this.amountValue(this.bonusForm.amount) } : item);
    }

    this.activeView.set('bonus');
    this.closeForm();
    this.announce('Bonus saved', `${ref} was added and included in the payroll calculation queue.`, 'workspace_premium');
  }

  submitLoan(): void {
    const employee = this.employeeByCode(this.loanForm.employeeCode);
    const ref = `ADV-${this.loanSequence + 1}`;
    const emi = this.amountValue(this.loanForm.emi);
    this.loanSequence += 1;

    this.loanRows = [
      {
        ref,
        employeeCode: this.loanForm.employeeCode,
        employee: employee?.name ?? 'Employee',
        type: this.text(this.loanForm.type, 'Salary Advance'),
        principal: this.amountValue(this.loanForm.principal),
        balance: this.amountValue(this.loanForm.principal),
        emi,
        nextRecovery: `${this.selectedPeriod} payroll`,
        status: 'Active',
      },
      ...this.loanRows,
    ];

    if (employee) {
      this.employees = this.employees.map((item) => item.code === employee.code ? { ...item, loanEmi: item.loanEmi + emi } : item);
    }

    this.activeView.set('loans');
    this.closeForm();
    this.announce('Advance saved', `${ref} was linked to payroll recovery.`, 'add_card');
  }

  processPayroll(): void {
    this.employees = this.employees.map((employee) => ({
      ...employee,
      status: employee.status === 'Paid' ? 'Paid' : employee.status === 'Approved' ? 'Approved' : 'Calculated',
    }));
    this.activeView.set('salary');
    this.announce('Payroll calculated', 'Salary, PF, ESI, PT, TDS, bonus, incentive, and loan deductions were refreshed.', 'calculate');
  }

  generatePayslips(): void {
    this.employees = this.employees.map((employee) => ({
      ...employee,
      payslipStatus: employee.payslipStatus === 'Delivered' ? 'Delivered' : 'Generated',
    }));
    this.activeView.set('payslips');
    this.announce('Payslips generated', 'Payslip PDFs are ready for email, WhatsApp, or client portal delivery.', 'receipt_long');
  }

  deliverPayslips(): void {
    this.employees = this.employees.map((employee) => ({ ...employee, payslipStatus: 'Delivered' }));
    this.activeView.set('payslips');
    this.announce('Payslips delivered', 'All generated payslips were marked as delivered.', 'send');
  }

  deliverPayslip(employee: PayrollEmployee): void {
    this.employees = this.employees.map((item) => item.id === employee.id ? { ...item, payslipStatus: 'Delivered' } : item);
    this.announce('Payslip delivered', `${employee.name}'s payslip was marked as delivered.`, 'mail');
  }

  prepareAllForm16(): void {
    this.employees = this.employees.map((employee) => ({
      ...employee,
      form16Status: employee.tdsMonthly > 0 ? 'Generated' : employee.form16Status,
    }));
    this.announce('Form 16 prepared', 'TDS employees were marked as Form 16 generated.', 'description');
  }

  prepareForm16(employee: PayrollEmployee): void {
    this.employees = this.employees.map((item) => item.id === employee.id ? { ...item, form16Status: item.tdsMonthly > 0 ? 'Generated' : 'Not applicable' } : item);
    this.announce('Form 16 prepared', `${employee.name}'s salary TDS statement is ready.`, 'description');
  }

  approveLeave(ref: string): void {
    this.leaveRequests = this.leaveRequests.map((leave) => leave.ref === ref && leave.status === 'Pending' ? { ...leave, status: 'Approved' } : leave);
    this.announce('Leave reviewed', `${ref} was updated in the leave register.`, 'event_available');
  }

  syncAttendance(): void {
    this.attendanceRows = this.attendanceRows.map((row) => ({ ...row, status: 'Synced' }));
    this.announce('Attendance synced', 'Attendance rows were refreshed for payroll payable days.', 'sync');
  }

  recordLoanRecovery(): void {
    let recovered = false;
    this.loanRows = this.loanRows.map((loan) => {
      if (recovered || loan.balance <= 0) return loan;
      recovered = true;
      const nextBalance = Math.max(loan.balance - loan.emi, 0);
      return {
        ...loan,
        balance: nextBalance,
        status: nextBalance === 0 ? 'Closed' : 'Active',
      };
    });
    this.announce('EMI recovered', recovered ? 'The next active employee advance was reduced by one EMI.' : 'No active balance is available for recovery.', 'payments');
  }

  saveSettings(): void {
    this.announce('Settings saved', 'Payroll rules and delivery controls were saved for this client workspace.', 'save');
  }

  exportCurrentView(view: PayrollView = this.activeView()): void {
    this.downloadCsv(`payroll-hr-${view}-${this.today()}.csv`, this.exportRowsFor(view));
    this.announce('Export ready', `${this.labelForView(view)} data was downloaded as CSV.`, 'file_download');
  }

  formTitle(): string {
    switch (this.activeForm()) {
      case 'employee':
        return 'Employee payroll profile';
      case 'bonus':
        return 'Bonus or incentive entry';
      case 'loan':
        return 'Loan or advance entry';
      default:
        return 'Payroll data entry';
    }
  }

  formSubtitle(): string {
    switch (this.activeForm()) {
      case 'employee':
        return 'Create the employee salary structure with PAN, UAN, ESIC, state, and TDS details.';
      case 'bonus':
        return 'Add variable pay that flows into the selected payroll period.';
      case 'loan':
        return 'Create an employee advance and attach monthly EMI recovery to salary processing.';
      default:
        return 'Enter details and save them to Payroll & HR.';
    }
  }

  formSubmitLabel(): string {
    switch (this.activeForm()) {
      case 'employee':
        return 'Save employee';
      case 'bonus':
        return 'Save bonus';
      case 'loan':
        return 'Save advance';
      default:
        return 'Save';
    }
  }

  grossSalary(employee: PayrollEmployee): number {
    return this.prorated(employee.basic + employee.hra + employee.allowance + employee.bonus + employee.incentive, employee.daysPayable);
  }

  annualGross(employee: PayrollEmployee): number {
    return this.grossSalary(employee) * 12;
  }

  pfEmployee(employee: PayrollEmployee): number {
    return Math.round(Math.min(employee.basic, 15000) * 0.12);
  }

  pfEmployer(employee: PayrollEmployee): number {
    return Math.round(Math.min(employee.basic, 15000) * 0.12);
  }

  esiEmployee(employee: PayrollEmployee): number {
    const gross = this.grossSalary(employee);
    return gross <= 21000 ? Math.ceil(gross * 0.0075) : 0;
  }

  esiEmployer(employee: PayrollEmployee): number {
    const gross = this.grossSalary(employee);
    return gross <= 21000 ? Math.ceil(gross * 0.0325) : 0;
  }

  professionalTax(employee: PayrollEmployee): number {
    const gross = this.grossSalary(employee);
    switch (employee.state) {
      case 'Maharashtra':
        return gross > 10000 ? 200 : 0;
      case 'Karnataka':
        return gross > 25000 ? 200 : 0;
      case 'Gujarat':
        return gross > 12000 ? 200 : 0;
      default:
        return 0;
    }
  }

  netPay(employee: PayrollEmployee): number {
    return Math.max(
      this.grossSalary(employee) -
        this.pfEmployee(employee) -
        this.esiEmployee(employee) -
        this.professionalTax(employee) -
        employee.tdsMonthly -
        employee.loanEmi,
      0
    );
  }

  totalGross(): number {
    return this.employees.reduce((total, employee) => total + this.grossSalary(employee), 0);
  }

  totalNetPay(): number {
    return this.employees.reduce((total, employee) => total + this.netPay(employee), 0);
  }

  totalPfEmployee(): number {
    return this.employees.reduce((total, employee) => total + this.pfEmployee(employee), 0);
  }

  totalPfEmployer(): number {
    return this.employees.reduce((total, employee) => total + this.pfEmployer(employee), 0);
  }

  totalEsiPayable(): number {
    return this.employees.reduce((total, employee) => total + this.esiEmployee(employee) + this.esiEmployer(employee), 0);
  }

  totalPt(): number {
    return this.employees.reduce((total, employee) => total + this.professionalTax(employee), 0);
  }

  totalTds(): number {
    return this.employees.reduce((total, employee) => total + employee.tdsMonthly, 0);
  }

  totalStatutoryDues(): number {
    return this.totalPfEmployee() + this.totalPfEmployer() + this.totalEsiPayable() + this.totalPt() + this.totalTds();
  }

  totalLoanBalance(): number {
    return this.loanRows.reduce((total, loan) => total + loan.balance, 0);
  }

  processedCount(): number {
    return this.employees.filter((employee) => employee.status !== 'Draft').length;
  }

  payrollProgress(): number {
    if (this.employees.length === 0) return 0;
    return Math.round((this.processedCount() / this.employees.length) * 100);
  }

  deliveredPayslips(): number {
    return this.employees.filter((employee) => employee.payslipStatus === 'Delivered').length;
  }

  pendingLeaves(): number {
    return this.leaveRequests.filter((leave) => leave.status === 'Pending').length;
  }

  attendancePercent(value: number): number {
    const total = Math.max(...this.attendanceRows.map((row) => row.present + row.absent + row.onLeave), 1);
    return Math.round((value / total) * 100);
  }

  private viewForForm(form: PayrollForm): PayrollView {
    switch (form) {
      case 'employee':
        return 'employees';
      case 'bonus':
        return 'bonus';
      case 'loan':
        return 'loans';
      default:
        return 'dashboard';
    }
  }

  private employeeByCode(code: string): PayrollEmployee | undefined {
    return this.employees.find((employee) => employee.code === code);
  }

  private prorated(amount: number, daysPayable: number): number {
    return Math.round((amount / 30) * Math.min(Math.max(daysPayable, 0), 30));
  }

  private text(value: string, fallback: string): string {
    const trimmed = String(value ?? '').trim();
    return trimmed || fallback;
  }

  private amountValue(value: number | string): number {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
  }

  private money(value: number): string {
    return `INR ${Math.round(value).toLocaleString('en-IN')}`;
  }

  private announce(title: string, message: string, icon: string = 'check_circle'): void {
    this.actionTitle.set(title);
    this.actionMessage.set(message);
    this.actionIcon.set(icon);
  }

  private resetEmployeeForm(): void {
    this.employeeForm = {
      ...this.employeeForm,
      id: '',
      code: `EMP-${String(this.employeeSequence).padStart(3, '0')}`,
      name: '',
      designation: '',
      pan: '',
      uan: '',
      esic: '',
      basic: 25000,
      hra: 12500,
      allowance: 7500,
      tdsMonthly: 0,
    };
  }

  private exportRowsFor(view: PayrollView): Array<Array<string | number>> {
    switch (view) {
      case 'employees':
        return [
          ['Code', 'Name', 'Department', 'Designation', 'PAN', 'UAN', 'Gross', 'Status'],
          ...this.employees.map((employee) => [employee.code, employee.name, employee.department, employee.designation, employee.pan, employee.uan, this.grossSalary(employee), employee.status]),
        ];
      case 'salary':
        return [
          ['Employee', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Loan', 'Net Pay', 'Status'],
          ...this.employees.map((employee) => [employee.name, this.grossSalary(employee), this.pfEmployee(employee), this.esiEmployee(employee), this.professionalTax(employee), employee.tdsMonthly, employee.loanEmi, this.netPay(employee), employee.status]),
        ];
      case 'statutory':
        return [
          ['Employee', 'State', 'PF Employee', 'PF Employer', 'ESI Employee', 'ESI Employer', 'PT'],
          ...this.employees.map((employee) => [employee.name, employee.state, this.pfEmployee(employee), this.pfEmployer(employee), this.esiEmployee(employee), this.esiEmployer(employee), this.professionalTax(employee)]),
        ];
      case 'tds':
        return [
          ['Employee', 'PAN', 'Annual Gross', 'Annual TDS', 'Form 16'],
          ...this.employees.map((employee) => [employee.name, employee.pan, this.annualGross(employee), employee.tdsMonthly * 12, employee.form16Status]),
        ];
      case 'payslips':
        return [
          ['Employee', 'Bank', 'Net Pay', 'Payslip Status'],
          ...this.employees.map((employee) => [employee.name, employee.bank, this.netPay(employee), employee.payslipStatus]),
        ];
      case 'attendance':
        return [
          ['Date', 'Present', 'Leave', 'Absent', 'OT Hours', 'Status'],
          ...this.attendanceRows.map((row) => [row.date, row.present, row.onLeave, row.absent, row.overtimeHours, row.status]),
        ];
      case 'bonus':
        return [
          ['Ref', 'Employee', 'Type', 'Period', 'Amount', 'Status'],
          ...this.bonusRows.map((row) => [row.ref, row.employee, row.type, row.period, row.amount, row.status]),
        ];
      case 'loans':
        return [
          ['Ref', 'Employee', 'Type', 'Principal', 'Balance', 'EMI', 'Next Recovery', 'Status'],
          ...this.loanRows.map((row) => [row.ref, row.employee, row.type, row.principal, row.balance, row.emi, row.nextRecovery, row.status]),
        ];
      default:
        return [['Metric', 'Value', 'Helper'], ...this.dashboardMetrics().map((row) => [row.label, row.value, row.helper])];
    }
  }

  private downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
    if (typeof document === 'undefined') return;
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private labelForView(view: PayrollView): string {
    return this.menuItems.find((item) => item.id === view)?.label ?? 'Payroll & HR';
  }
}
