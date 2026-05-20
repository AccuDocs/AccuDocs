import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayrollHrComponent } from './payroll-hr.component';

describe('PayrollHrComponent', () => {
  let fixture: ComponentFixture<PayrollHrComponent>;
  let component: PayrollHrComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollHrComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollHrComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the payroll dashboard and navigation', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Payroll & HR');
    expect(text).toContain('Gross Payroll');
    expect(text).toContain('Salary Processing');
    expect(text).toContain('PF, ESI, PT');
  });

  it('opens every Payroll & HR submodule with visible content', () => {
    const cases: Array<[Parameters<PayrollHrComponent['openView']>[0], string]> = [
      ['dashboard', 'Payroll run'],
      ['employees', 'Employee master'],
      ['salary', 'payroll register'],
      ['statutory', 'Employee-wise statutory split'],
      ['tds', 'Form 16 preparation'],
      ['payslips', 'Employee payslip queue'],
      ['attendance', 'Daily attendance summary'],
      ['bonus', 'Variable pay register'],
      ['loans', 'Recoveries linked to payroll'],
      ['settings', 'Payroll controls'],
    ];

    for (const [view, expectedText] of cases) {
      component.openView(view);
      fixture.detectChanges();

      expect(component.activeView()).toBe(view);
      expect(fixture.nativeElement.textContent).toContain(expectedText);
    }
  });

  it('adds an employee profile from the employee master form', () => {
    const count = component.employees.length;

    component.addEmployee();
    fixture.detectChanges();

    expect(component.activeView()).toBe('employees');
    expect(component.activeForm()).toBe('employee');

    component.employeeForm.code = 'EMP-099';
    component.employeeForm.name = 'Test Payroll User';
    component.employeeForm.designation = 'Payroll Tester';
    component.employeeForm.pan = 'TESTP1234Q';
    component.employeeForm.basic = 30000;
    component.employeeForm.hra = 15000;
    component.employeeForm.allowance = 5000;
    component.employeeForm.tdsMonthly = 1000;
    component.submitEmployee();
    fixture.detectChanges();

    expect(component.employees.length).toBe(count + 1);
    expect(component.employees[0].code).toBe('EMP-099');
    expect(component.employees[0].name).toBe('Test Payroll User');
    expect(component.employees[0].form16Status).toBe('Pending review');
    expect(component.activeForm()).toBeNull();
  });

  it('processes salary and recalculates payroll rows', () => {
    component.employees = component.employees.map((employee) => ({ ...employee, status: 'Draft' }));

    component.processPayroll();
    fixture.detectChanges();

    expect(component.activeView()).toBe('salary');
    expect(component.employees.every((employee) => employee.status === 'Calculated')).toBeTrue();
    expect(component.totalNetPay()).toBeGreaterThan(0);
    expect(component.actionMessage()).toContain('PF, ESI, PT, TDS');
  });

  it('calculates PF, ESI, PT, TDS, and net salary totals', () => {
    const highEarner = component.employees.find((employee) => employee.code === 'EMP-001');
    const esiEligible = component.employees.find((employee) => employee.code === 'EMP-003');

    expect(highEarner).toBeDefined();
    expect(esiEligible).toBeDefined();
    expect(component.pfEmployee(highEarner!)).toBe(1800);
    expect(component.esiEmployee(highEarner!)).toBe(0);
    expect(component.esiEmployee(esiEligible!)).toBeGreaterThan(0);
    expect(component.professionalTax(highEarner!)).toBe(200);
    expect(component.totalStatutoryDues()).toBeGreaterThan(component.totalTds());
    expect(component.netPay(highEarner!)).toBeLessThan(component.grossSalary(highEarner!));
  });

  it('generates and delivers payslips', () => {
    component.generatePayslips();
    fixture.detectChanges();

    expect(component.activeView()).toBe('payslips');
    expect(component.employees.some((employee) => employee.payslipStatus === 'Generated')).toBeTrue();

    component.deliverPayslips();

    expect(component.employees.every((employee) => employee.payslipStatus === 'Delivered')).toBeTrue();
  });

  it('delivers a single payslip without changing the selected employee salary', () => {
    const employee = component.employees.find((item) => item.code === 'EMP-002');
    const netPay = component.netPay(employee!);

    component.deliverPayslip(employee!);

    expect(component.employees.find((item) => item.code === 'EMP-002')?.payslipStatus).toBe('Delivered');
    expect(component.netPay(component.employees.find((item) => item.code === 'EMP-002')!)).toBe(netPay);
  });

  it('adds bonus and loan rows through data entry actions', () => {
    const bonusCount = component.bonusRows.length;
    const loanCount = component.loanRows.length;

    component.addBonus();
    component.bonusForm.employeeCode = 'EMP-001';
    component.bonusForm.amount = 6500;
    component.submitBonus();

    component.addLoan();
    component.loanForm.employeeCode = 'EMP-002';
    component.loanForm.principal = 18000;
    component.loanForm.emi = 3000;
    component.submitLoan();

    expect(component.bonusRows.length).toBe(bonusCount + 1);
    expect(component.bonusRows[0].amount).toBe(6500);
    expect(component.loanRows.length).toBe(loanCount + 1);
    expect(component.loanRows[0].principal).toBe(18000);
    expect(component.employees.find((employee) => employee.code === 'EMP-002')?.loanEmi).toBe(3000);
  });

  it('syncs attendance and approves pending leave requests', () => {
    expect(component.leaveRequests.some((leave) => leave.status === 'Pending')).toBeTrue();
    expect(component.attendanceRows.some((row) => row.status !== 'Synced')).toBeTrue();

    component.approveLeave('LV-2102');
    component.syncAttendance();
    fixture.detectChanges();

    expect(component.leaveRequests.find((leave) => leave.ref === 'LV-2102')?.status).toBe('Approved');
    expect(component.attendanceRows.every((row) => row.status === 'Synced')).toBeTrue();
    expect(component.actionMessage()).toContain('Attendance rows');
  });

  it('records an EMI recovery against the first open employee advance', () => {
    const firstLoan = component.loanRows[0];
    const previousBalance = firstLoan.balance;

    component.recordLoanRecovery();

    expect(component.loanRows[0].balance).toBe(Math.max(previousBalance - firstLoan.emi, 0));
    expect(component.actionMessage()).toContain('reduced by one EMI');
  });

  it('prepares Form 16 for employees with salary TDS', () => {
    component.prepareAllForm16();

    expect(component.employees.filter((employee) => employee.tdsMonthly > 0).every((employee) => employee.form16Status === 'Generated')).toBeTrue();
  });

  it('saves payroll controls from the settings submodule', () => {
    component.openView('settings');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Maker-checker enabled');

    component.saveSettings();

    expect(component.actionMessage()).toContain('Payroll rules');
  });
});
