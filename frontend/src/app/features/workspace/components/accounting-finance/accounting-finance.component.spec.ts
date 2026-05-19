import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountingFinanceComponent } from './accounting-finance.component';

describe('AccountingFinanceComponent', () => {
  let fixture: ComponentFixture<AccountingFinanceComponent>;
  let component: AccountingFinanceComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountingFinanceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingFinanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders dashboard dummy data and module navigation', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Accounting & Finance');
    expect(text).toContain('Total Revenue');
    expect(text).toContain('Chart of Accounts');
    expect(text).toContain('GST & Taxes');
  });

  it('opens module sections from component actions', () => {
    component.openView('cashflow');
    fixture.detectChanges();

    expect(component.activeView()).toBe('cashflow');
    expect(fixture.nativeElement.textContent).toContain('Cash flow statement');
  });

  it('creates chart of accounts rows through the data entry form', () => {
    const count = component.accounts.length;

    component.addAccount();
    fixture.detectChanges();

    expect(component.activeForm()).toBe('account');

    component.accountForm.code = '6110';
    component.accountForm.account = 'Testing Expense Account';
    component.accountForm.opening = 1200;
    component.submitAccount();
    fixture.detectChanges();

    expect(component.accounts.length).toBe(count + 1);
    expect(component.accounts[0].account).toBe('Testing Expense Account');
    expect(component.accounts[0].opening).toBe(1200);
    expect(component.activeForm()).toBeNull();
  });

  it('creates and posts voucher data from the composer form', () => {
    const count = component.vouchers.length;

    component.startVoucher('Payment Voucher');
    component.voucherForm.narration = 'Testing payment voucher';
    component.voucherForm.amount = 9900;
    component.saveDraftVoucher();
    component.postVoucher();
    fixture.detectChanges();

    expect(component.vouchers.length).toBe(count + 2);
    expect(component.vouchers[0].status).toBe('Posted');
    expect(component.vouchers[0].narration).toBe('Testing payment voucher');
    expect(component.vouchers[0].amount).toBe(9900);
    expect(component.vouchers[1].status).toBe('Draft');
    expect(component.activeView()).toBe('vouchers');
  });

  it('filters vouchers by selected status', () => {
    component.voucherStatusFilter = 'Posted';

    expect(component.filteredVouchers().every((voucher) => voucher.status === 'Posted')).toBeTrue();
  });

  it('updates banking data after import form submission', () => {
    const previousMatched = component.bankingRows[0].matched;
    const previousAlerts = component.reconciliationAlerts.length;

    component.importBankStatement();
    fixture.detectChanges();

    expect(component.activeForm()).toBe('bankImport');

    component.bankImportForm.title = 'Testing statement import';
    component.bankImportForm.amount = 15000;
    component.bankImportForm.matched = 5;
    component.submitBankStatementImport();
    fixture.detectChanges();

    expect(component.bankingRows[0].matched).toBe(previousMatched + 5);
    expect(component.reconciliationAlerts.length).toBe(previousAlerts + 1);
    expect(component.reconciliationAlerts[0].title).toBe('Testing statement import');
    expect(component.actionMessage()).toContain('reconciliation queue');
  });
});
