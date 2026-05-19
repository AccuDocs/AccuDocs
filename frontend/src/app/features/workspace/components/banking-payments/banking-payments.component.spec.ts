import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankingPaymentsComponent } from './banking-payments.component';

describe('BankingPaymentsComponent', () => {
  let fixture: ComponentFixture<BankingPaymentsComponent>;
  let component: BankingPaymentsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankingPaymentsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BankingPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the banking dashboard and menu', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Banking & Payments');
    expect(text).toContain('Total Bank Balance');
    expect(text).toContain('Bank Accounts');
    expect(text).toContain('Reconciliation');
  });

  it('adds a dummy bank account', () => {
    const count = component.bankAccounts.length;

    component.addBankAccount();
    fixture.detectChanges();

    expect(component.activeView()).toBe('accounts');
    expect(component.bankAccounts.length).toBe(count + 1);
    expect(component.bankAccounts[0].bank).toBe('Axis Bank');
  });

  it('imports statement rows for reconciliation', () => {
    const transactionCount = component.bankTransactions.length;
    const reconciliationCount = component.reconciliationRows.length;

    component.importStatement();
    fixture.detectChanges();

    expect(component.bankTransactions.length).toBe(transactionCount + 1);
    expect(component.reconciliationRows.length).toBe(reconciliationCount + 1);
    expect(component.reconciliationRows[0].status).toBe('Unmatched');
  });

  it('matches the first available reconciliation row', () => {
    component.matchTransaction();
    fixture.detectChanges();

    expect(component.reconciliationRows[0].status).toBe('Matched');
    expect(component.actionMessage()).toContain('ERP ledger');
  });

  it('creates UPI, gateway, cash, transfer, and reminder dummy rows', () => {
    const upiCount = component.upiCollections.length;
    const gatewayCount = component.gatewayTransactions.length;
    const cashCount = component.cashEntries.length;
    const transferCount = component.transfers.length;
    const reminderCount = component.reminders.length;

    component.generateUpiQr();
    component.createPaymentLink();
    component.recordCashEntry();
    component.createTransfer();
    component.sendReminder();
    fixture.detectChanges();

    expect(component.upiCollections.length).toBe(upiCount + 1);
    expect(component.gatewayTransactions.length).toBe(gatewayCount + 1);
    expect(component.cashEntries.length).toBe(cashCount + 1);
    expect(component.transfers.length).toBe(transferCount + 1);
    expect(component.reminders.length).toBe(reminderCount + 1);
  });
});
