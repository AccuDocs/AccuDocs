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

  it('opens and submits a bank account form', () => {
    const count = component.bankAccounts.length;

    component.addBankAccount();
    fixture.detectChanges();

    expect(component.activeView()).toBe('accounts');
    expect(component.activeForm()).toBe('account');

    component.bankAccountForm.bank = 'Axis Bank Test';
    component.bankAccountForm.accountName = 'Operations Test';
    component.bankAccountForm.balance = 125000;
    component.submitBankAccount();
    fixture.detectChanges();

    expect(component.bankAccounts.length).toBe(count + 1);
    expect(component.bankAccounts[0].bank).toBe('Axis Bank Test');
    expect(component.bankAccounts[0].balance).toBe(125000);
    expect(component.activeForm()).toBeNull();
  });

  it('imports statement rows through the data entry form', () => {
    const transactionCount = component.bankTransactions.length;
    const reconciliationCount = component.reconciliationRows.length;

    component.importStatement();
    fixture.detectChanges();

    expect(component.activeForm()).toBe('statement');

    component.statementForm.narration = 'CSV customer receipt';
    component.statementForm.amount = 77000;
    component.submitStatementImport();
    fixture.detectChanges();

    expect(component.bankTransactions.length).toBe(transactionCount + 1);
    expect(component.reconciliationRows.length).toBe(reconciliationCount + 1);
    expect(component.bankTransactions[0].narration).toBe('CSV customer receipt');
    expect(component.reconciliationRows[0].amount).toBe(77000);
    expect(component.reconciliationRows[0].status).toBe('Unmatched');
  });

  it('matches the first available reconciliation row', () => {
    component.matchTransaction();
    fixture.detectChanges();

    expect(component.reconciliationRows[0].status).toBe('Matched');
    expect(component.actionMessage()).toContain('ERP ledger');
  });

  it('creates UPI, gateway, cash, transfer, and reminder rows from forms', () => {
    const upiCount = component.upiCollections.length;
    const gatewayCount = component.gatewayTransactions.length;
    const cashCount = component.cashEntries.length;
    const transferCount = component.transfers.length;
    const reminderCount = component.reminders.length;

    component.generateUpiQr();
    component.upiForm.payer = 'Form Payer';
    component.submitUpiCollection();

    component.createPaymentLink();
    component.gatewayForm.customer = 'Form Customer';
    component.submitPaymentLink();

    component.recordCashEntry();
    component.cashForm.amount = 5100;
    component.submitCashEntry();

    component.createTransfer();
    component.transferForm.beneficiary = 'Form Beneficiary';
    component.submitTransfer();

    component.sendReminder();
    component.reminderForm.party = 'Form Reminder Party';
    component.submitReminder();
    fixture.detectChanges();

    expect(component.upiCollections.length).toBe(upiCount + 1);
    expect(component.upiCollections[0].payer).toBe('Form Payer');
    expect(component.gatewayTransactions.length).toBe(gatewayCount + 1);
    expect(component.gatewayTransactions[0].customer).toBe('Form Customer');
    expect(component.cashEntries.length).toBe(cashCount + 1);
    expect(component.cashEntries[0].amount).toBe(5100);
    expect(component.transfers.length).toBe(transferCount + 1);
    expect(component.transfers[0].beneficiary).toBe('Form Beneficiary');
    expect(component.reminders.length).toBe(reminderCount + 1);
    expect(component.reminders[0].party).toBe('Form Reminder Party');
  });
});
