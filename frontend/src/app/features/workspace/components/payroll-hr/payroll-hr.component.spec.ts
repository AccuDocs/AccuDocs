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

  it('saves data-entry forms across salary, statutory, TDS, payslip, attendance, leave, and settings', () => {
    component.openSalaryAdjustment();
    component.salaryForm.employeeCode = 'EMP-003';
    component.salaryForm.daysPayable = 28;
    component.salaryForm.bonus = 1000;
    component.salaryForm.incentive = 500;
    component.salaryForm.loanEmi = 700;
    component.salaryForm.tdsMonthly = 50;
    component.salaryForm.status = 'Approved';
    component.submitSalaryAdjustment();

    let employee = component.employees.find((item) => item.code === 'EMP-003');
    expect(employee?.daysPayable).toBe(28);
    expect(employee?.bonus).toBe(1000);
    expect(employee?.status).toBe('Approved');

    component.openStatutoryProfile();
    component.statutoryForm.employeeCode = 'EMP-003';
    component.statutoryForm.state = 'Maharashtra';
    component.statutoryForm.uan = 'UAN-TEST-003';
    component.statutoryForm.esic = 'ESI-TEST-003';
    component.submitStatutoryProfile();

    employee = component.employees.find((item) => item.code === 'EMP-003');
    expect(employee?.state).toBe('Maharashtra');
    expect(employee?.uan).toBe('UAN-TEST-003');
    expect(employee?.esic).toBe('ESI-TEST-003');

    component.openTdsEntry();
    component.tdsForm.employeeCode = 'EMP-003';
    component.tdsForm.tdsMonthly = 900;
    component.tdsForm.form16Status = 'Draft ready';
    component.submitTdsEntry();

    employee = component.employees.find((item) => item.code === 'EMP-003');
    expect(employee?.tdsMonthly).toBe(900);
    expect(employee?.form16Status).toBe('Draft ready');

    component.openPayslipDelivery();
    component.payslipForm.employeeCode = 'EMP-003';
    component.payslipForm.status = 'Delivered';
    component.payslipForm.channel = 'WhatsApp';
    component.payslipForm.bank = 'Axis Payroll Test';
    component.submitPayslipDelivery();

    employee = component.employees.find((item) => item.code === 'EMP-003');
    expect(employee?.payslipStatus).toBe('Delivered');
    expect(employee?.bank).toBe('Axis Payroll Test');

    const attendanceCount = component.attendanceRows.length;
    component.addAttendanceEntry();
    component.attendanceForm = { date: '2026-05-21', present: 32, absent: 1, onLeave: 1, overtimeHours: 4, status: 'Synced' };
    component.submitAttendanceEntry();

    expect(component.attendanceRows.length).toBe(attendanceCount + 1);
    expect(component.attendanceRows[0].date).toBe('2026-05-21');
    expect(component.attendanceRows[0].present).toBe(32);

    const leaveCount = component.leaveRequests.length;
    component.addLeaveRequest();
    component.leaveForm.employeeCode = 'EMP-003';
    component.leaveForm.type = 'Sick Leave';
    component.leaveForm.from = '2026-05-22';
    component.leaveForm.to = '2026-05-23';
    component.leaveForm.days = 2;
    component.leaveForm.status = 'Approved';
    component.submitLeaveRequest();

    employee = component.employees.find((item) => item.code === 'EMP-003');
    expect(component.leaveRequests.length).toBe(leaveCount + 1);
    expect(component.leaveRequests[0].employee).toBe('Kabir Rao');
    expect(employee?.daysPayable).toBe(26);

    component.editSettings();
    component.settingsForm.pfRule = '12% actual basic';
    component.settingsForm.channel = 'Client portal';
    component.settingsForm.bankAdvice = 'API payout ready';
    component.submitSettings();

    expect(component.payrollSettings[0].value).toBe('12% actual basic');
    expect(component.controlItems[1].value).toBe('Client portal');
    expect(component.controlItems[2].value).toBe('API payout ready');
    expect(component.activeForm()).toBeNull();
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
