import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '@core/services/user.service';
import { NotificationService } from '@core/services/notification.service';

type SubmitIntent = 'save' | 'assign' | 'another';

@Component({
  selector: 'app-staff-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <section class="staff-form-shell">
      <header class="staff-form-header">
        <div class="staff-form-title">
          <span class="staff-form-icon">
            <mat-icon>{{ isEditMode() ? 'manage_accounts' : 'person_add' }}</mat-icon>
          </span>
          <div>
            <p>Staff Profile</p>
            <h1>{{ isEditMode() ? 'Edit Staff' : 'Add Staff' }}</h1>
            <span>Basic Info -> Job Info -> Role Access -> Salary -> Documents -> Client Assignment</span>
          </div>
        </div>

        <button type="button" class="icon-button" (click)="onCancel()" title="Close">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <main class="staff-form-body">
        @if (isLoadingData()) {
          <div class="loading-state">
            <mat-spinner diameter="44"></mat-spinner>
            <strong>Loading staff profile...</strong>
          </div>
        } @else {
          <form [formGroup]="staffForm" (ngSubmit)="onSubmit()" class="staff-form">
            <section class="form-section">
              <div class="section-head">
                <mat-icon>badge</mat-icon>
                <div>
                  <h2>Basic Information</h2>
                  <p>Personal details and employee identity.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Employee ID</span>
                  <input formControlName="employeeId" readonly>
                </label>

                <label class="span-2">
                  <span>Full Name *</span>
                  <input formControlName="name" placeholder="Full name">
                </label>

                <label>
                  <span>Profile Photo</span>
                  <input type="file" accept="image/*" (change)="onFileSelected('profilePhotoFile', $event)">
                  <small>{{ staffForm.value.profilePhotoFile || 'Upload profile photo' }}</small>
                </label>

                <label>
                  <span>Gender</span>
                  <select formControlName="gender">
                    <option value="">Select</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </label>

                <label>
                  <span>Date of Birth</span>
                  <input type="date" formControlName="dateOfBirth">
                </label>

                <label>
                  <span>Mobile Number *</span>
                  <input formControlName="mobile" placeholder="00000 00000" (input)="onMobileInput($event)">
                </label>

                <label>
                  <span>Personal Email</span>
                  <input type="email" formControlName="personalEmail" placeholder="personal@example.com">
                </label>

                <label>
                  <span>Emergency Contact Name</span>
                  <input formControlName="emergencyContactName" placeholder="Contact person">
                </label>

                <label>
                  <span>Emergency Contact Mobile</span>
                  <input formControlName="emergencyContactMobile" placeholder="+91...">
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>work</mat-icon>
                <div>
                  <h2>Professional Information</h2>
                  <p>Joining, designation, department, and employment type.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Joining Date</span>
                  <input type="date" formControlName="joiningDate">
                </label>

                <label>
                  <span>Designation</span>
                  <select formControlName="designation">
                    @for (option of designationOptions; track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Department</span>
                  <select formControlName="department">
                    @for (option of departmentOptions; track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Employment Type</span>
                  <select formControlName="employmentType">
                    @for (option of employmentTypeOptions; track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>lock</mat-icon>
                <div>
                  <h2>Login & Security</h2>
                  <p>Credentials and security settings for software access.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Username</span>
                  <input formControlName="username" placeholder="employee username">
                </label>

                <label>
                  <span>Official Email</span>
                  <input type="email" formControlName="email" placeholder="official@example.com">
                </label>

                <label>
                  <span>Password <b *ngIf="!isEditMode()">*</b></span>
                  <input type="password" formControlName="password" placeholder="Minimum 8 characters">
                </label>

                <label>
                  <span>Confirm Password <b *ngIf="!isEditMode()">*</b></span>
                  <input type="password" formControlName="confirmPassword" placeholder="Re-enter password">
                </label>

                <label class="toggle-row">
                  <input type="checkbox" formControlName="twoFactorEnabled">
                  <span>Two-Factor Auth</span>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>admin_panel_settings</mat-icon>
                <div>
                  <h2>Role & Permission</h2>
                  <p>Role-based access control for internal users.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Role</span>
                  <select formControlName="accessRole">
                    @for (option of accessRoleOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </label>
              </div>

              <div class="permission-grid" formGroupName="permissions">
                @for (permission of permissionOptions; track permission.key) {
                  <label>
                    <input type="checkbox" [formControlName]="permission.key">
                    <span>{{ permission.label }}</span>
                  </label>
                }
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>payments</mat-icon>
                <div>
                  <h2>Salary Information</h2>
                  <p>Salary breakup and payment mode.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Monthly Salary</span>
                  <input type="number" formControlName="monthlySalary" placeholder="0">
                </label>
                <label>
                  <span>Basic Salary</span>
                  <input type="number" formControlName="basicSalary" placeholder="0">
                </label>
                <label>
                  <span>Allowances</span>
                  <input type="number" formControlName="allowances" placeholder="0">
                </label>
                <label>
                  <span>Incentive</span>
                  <input type="number" formControlName="incentive" placeholder="0">
                </label>
                <label>
                  <span>PF / ESI</span>
                  <input type="number" formControlName="pfEsi" placeholder="0">
                </label>
                <label>
                  <span>Payment Mode</span>
                  <select formControlName="paymentMode">
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                    <option>UPI</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>account_balance</mat-icon>
                <div>
                  <h2>Bank Information</h2>
                  <p>Bank details for salary payout sheets.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Account Holder Name</span>
                  <input formControlName="accountHolderName" placeholder="Account holder">
                </label>
                <label>
                  <span>Bank Name</span>
                  <select formControlName="bankName">
                    @for (option of bankOptions; track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>Account Number</span>
                  <input formControlName="accountNumber" placeholder="Account number">
                </label>
                <label>
                  <span>IFSC Code</span>
                  <input formControlName="ifscCode" placeholder="IFSC">
                </label>
                <label>
                  <span>Branch</span>
                  <input formControlName="bankBranch" placeholder="Branch">
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>folder</mat-icon>
                <div>
                  <h2>Compliance Documents</h2>
                  <p>PAN, Aadhaar, appointment letter, resume, and certificates.</p>
                </div>
              </div>

              <div class="document-grid">
                @for (doc of documentOptions; track doc.key) {
                  <label>
                    <span>{{ doc.label }}</span>
                    <input type="file" (change)="onFileSelected(doc.key, $event)">
                    <small>{{ staffForm.value[doc.key] || 'No file selected' }}</small>
                  </label>
                }
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>assignment_ind</mat-icon>
                <div>
                  <h2>Skills & Assignment</h2>
                  <p>Work capabilities, reporting manager, clients, and branch office.</p>
                </div>
              </div>

              <div class="permission-grid" formGroupName="skills">
                @for (skill of skillOptions; track skill.key) {
                  <label>
                    <input type="checkbox" [formControlName]="skill.key">
                    <span>{{ skill.label }}</span>
                  </label>
                }
              </div>

              <div class="form-grid assignment-grid">
                <label>
                  <span>Reporting Manager</span>
                  <input formControlName="reportingManager" placeholder="Manager name">
                </label>
                <label>
                  <span>Branch Office</span>
                  <input formControlName="branchOffice" placeholder="Ahmedabad Head Office">
                </label>
                <label class="span-2">
                  <span>Assigned Clients</span>
                  <textarea formControlName="assignedClients" rows="3" placeholder="Client names, separated by commas"></textarea>
                </label>
              </div>
            </section>

            <section class="form-section">
              <div class="section-head">
                <mat-icon>toggle_on</mat-icon>
                <div>
                  <h2>Status</h2>
                  <p>Employment lifecycle and software access status.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Staff Status</span>
                  <select formControlName="employmentStatus">
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Notice Period</option>
                    <option>Terminated</option>
                  </select>
                </label>

                <label class="toggle-row">
                  <input type="checkbox" formControlName="isActive">
                  <span>Software Login Active</span>
                </label>
              </div>
            </section>

            @if (passwordMismatch()) {
              <p class="form-error">Password and confirm password do not match.</p>
            }

            <footer class="form-actions">
              <button type="button" class="secondary-button" (click)="onCancel()">Cancel</button>
              <button type="submit" class="secondary-button" (click)="submitIntent.set('another')" [disabled]="staffForm.invalid || isSubmitting()">
                Save & Add Another
              </button>
              <button type="submit" class="secondary-button" (click)="submitIntent.set('assign')" [disabled]="staffForm.invalid || isSubmitting()">
                Save & Assign Client
              </button>
              <button type="submit" class="primary-button" (click)="submitIntent.set('save')" [disabled]="staffForm.invalid || isSubmitting()">
                @if (isSubmitting()) {
                  Saving...
                } @else {
                  Save Staff
                }
              </button>
            </footer>
          </form>
        }
      </main>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .staff-form-shell {
      background: #f8fbff;
      border: 1px solid #dbe4ef;
      border-radius: 16px;
      color: #0f172a;
      overflow: hidden;
    }

    .staff-form-header {
      align-items: center;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      padding: 18px 22px;
    }

    .staff-form-title {
      align-items: center;
      display: flex;
      gap: 14px;
      min-width: 0;
    }

    .staff-form-icon {
      align-items: center;
      background: #eaf2ff;
      border-radius: 14px;
      color: #2454dc;
      display: flex;
      height: 48px;
      justify-content: center;
      width: 48px;
    }

    .staff-form-title p {
      color: #2454dc;
      font-size: 11px;
      font-weight: 950;
      margin: 0 0 3px;
      text-transform: uppercase;
    }

    .staff-form-title h1 {
      color: #020617;
      font-size: 24px;
      font-weight: 950;
      line-height: 1.1;
      margin: 0;
    }

    .staff-form-title span {
      color: #64748b;
      display: block;
      font-size: 12px;
      font-weight: 750;
      margin-top: 4px;
    }

    .icon-button {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 10px;
      color: #64748b;
      cursor: pointer;
      display: flex;
      height: 38px;
      justify-content: center;
      width: 38px;
    }

    .icon-button:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .staff-form-body {
      max-height: min(78vh, 920px);
      overflow-y: auto;
      padding: 18px;
    }

    .staff-form {
      display: grid;
      gap: 16px;
    }

    .form-section {
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, .045);
      padding: 18px;
    }

    .section-head {
      align-items: center;
      border-bottom: 1px solid #edf2f7;
      color: #2454dc;
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 14px;
    }

    .section-head h2 {
      color: #020617;
      font-size: 16px;
      font-weight: 950;
      margin: 0;
    }

    .section-head p {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      margin: 3px 0 0;
    }

    .form-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    label {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    label > span {
      color: #52657f;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: .02em;
      text-transform: uppercase;
    }

    input,
    select,
    textarea {
      background: #f8fbff;
      border: 1px solid #dbe4ef;
      border-radius: 11px;
      color: #0f172a;
      font-size: 13px;
      font-weight: 750;
      min-height: 42px;
      outline: none;
      padding: 0 12px;
      width: 100%;
    }

    textarea {
      min-height: 86px;
      padding: 11px 12px;
      resize: vertical;
    }

    input[type="file"] {
      align-items: center;
      display: flex;
      padding: 9px 12px;
    }

    input:focus,
    select:focus,
    textarea:focus {
      background: #fff;
      border-color: #93b4ff;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, .10);
    }

    input[readonly] {
      background: #edf2f7;
      color: #52657f;
    }

    small {
      color: #8a9bb2;
      font-size: 11px;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .span-2 {
      grid-column: span 2;
    }

    .permission-grid,
    .document-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .permission-grid label,
    .toggle-row {
      align-items: center;
      background: #f8fbff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      display: flex;
      flex-direction: row;
      gap: 10px;
      min-height: 44px;
      padding: 0 12px;
    }

    .permission-grid input,
    .toggle-row input {
      height: 16px;
      min-height: 16px;
      padding: 0;
      width: 16px;
    }

    .document-grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .assignment-grid {
      margin-top: 16px;
    }

    .form-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      color: #dc2626;
      font-size: 13px;
      font-weight: 850;
      margin: 0;
      padding: 12px 14px;
    }

    .form-actions {
      align-items: center;
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
      padding: 14px;
      position: sticky;
      bottom: 0;
      z-index: 2;
    }

    .primary-button,
    .secondary-button {
      border: 0;
      border-radius: 11px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 950;
      min-height: 42px;
      padding: 0 16px;
    }

    .primary-button {
      background: #2454dc;
      color: #fff;
    }

    .secondary-button {
      background: #edf5ff;
      color: #2454dc;
    }

    .primary-button:disabled,
    .secondary-button:disabled {
      cursor: not-allowed;
      opacity: .5;
    }

    .loading-state {
      align-items: center;
      color: #64748b;
      display: flex;
      flex-direction: column;
      gap: 14px;
      justify-content: center;
      min-height: 320px;
    }

    :host-context(.dark) .staff-form-shell {
      background: #0d1a2d;
      border-color: #263b59;
      color: #eaf2fc;
    }

    :host-context(.dark) .staff-form-header,
    :host-context(.dark) .form-section,
    :host-context(.dark) .form-actions {
      background: #10213a;
      border-color: #263b59;
      box-shadow: 0 12px 28px rgba(0, 0, 0, .26);
    }

    :host-context(.dark) .staff-form-body {
      background: #0d1a2d;
      scrollbar-color: #3b5578 #0d1a2d;
    }

    :host-context(.dark) .staff-form-icon,
    :host-context(.dark) .secondary-button {
      background: rgba(96, 165, 250, .16);
      color: #93c5fd;
    }

    :host-context(.dark) .staff-form-title p,
    :host-context(.dark) .section-head,
    :host-context(.dark) .section-head mat-icon {
      color: #93c5fd;
    }

    :host-context(.dark) .staff-form-title h1,
    :host-context(.dark) .section-head h2 {
      color: #eaf2fc;
    }

    :host-context(.dark) .staff-form-title span,
    :host-context(.dark) .section-head p,
    :host-context(.dark) label > span,
    :host-context(.dark) small,
    :host-context(.dark) .loading-state {
      color: #8ea2ba;
    }

    :host-context(.dark) .section-head {
      border-color: #263b59;
    }

    :host-context(.dark) input,
    :host-context(.dark) select,
    :host-context(.dark) textarea,
    :host-context(.dark) .permission-grid label,
    :host-context(.dark) .toggle-row {
      background: #14243c;
      border-color: #2d405e;
      color: #eaf2fc;
    }

    :host-context(.dark) input::placeholder,
    :host-context(.dark) textarea::placeholder {
      color: #637a96;
    }

    :host-context(.dark) input:focus,
    :host-context(.dark) select:focus,
    :host-context(.dark) textarea:focus {
      background: #172b48;
      border-color: #60a5fa;
      box-shadow: 0 0 0 4px rgba(96, 165, 250, .16);
    }

    :host-context(.dark) input[readonly] {
      background: #14243c;
      color: #b8c7d9;
    }

    :host-context(.dark) input[type="file"]::file-selector-button {
      background: #263b59;
      border: 0;
      border-radius: 8px;
      color: #eaf2fc;
      font-weight: 850;
      margin-right: 10px;
      min-height: 28px;
      padding: 0 10px;
    }

    :host-context(.dark) input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1) brightness(1.35);
    }

    :host-context(.dark) .icon-button {
      color: #8ea2ba;
    }

    :host-context(.dark) .icon-button:hover {
      background: rgba(244, 63, 94, .14);
      color: #fda4af;
    }

    @media (max-width: 1100px) {
      .form-grid,
      .permission-grid,
      .document-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      .staff-form-header,
      .form-actions {
        align-items: stretch;
        flex-direction: column;
      }

      .form-grid,
      .permission-grid,
      .document-grid {
        grid-template-columns: 1fr;
      }

      .span-2 {
        grid-column: span 1;
      }
    }
  `],
})
export class StaffFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal(false);
  isLoadingData = signal(false);
  isSubmitting = signal(false);
  passwordMismatch = signal(false);
  submitIntent = signal<SubmitIntent>('save');
  private userId: string | null = null;

  @Input() isModal = false;
  @Input() closeCallback?: () => void;

  designationOptions = ['CA Partner', 'Senior Accountant', 'Junior Accountant', 'Tax Executive', 'Audit Executive', 'Admin Executive'];
  departmentOptions = ['Accounts', 'Taxation', 'Audit', 'Compliance', 'Administration'];
  employmentTypeOptions = ['Full Time', 'Part Time', 'Intern', 'Contract'];
  bankOptions = ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda'];
  accessRoleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'tax_executive', label: 'Tax Executive' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'staff', label: 'Staff' },
  ];
  permissionOptions = [
    { key: 'clientManagement', label: 'Client Management' },
    { key: 'ledgerAccess', label: 'Ledger Access' },
    { key: 'invoiceAccess', label: 'Invoice Access' },
    { key: 'gstFiling', label: 'GST Filing' },
    { key: 'payrollAccess', label: 'Payroll Access' },
    { key: 'reportsAccess', label: 'Reports Access' },
    { key: 'staffManagement', label: 'Staff Management' },
  ];
  skillOptions = [
    { key: 'gstFiling', label: 'GST Filing' },
    { key: 'incomeTaxReturn', label: 'Income Tax Return' },
    { key: 'audit', label: 'Audit' },
    { key: 'bookkeeping', label: 'Bookkeeping' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'tdsFiling', label: 'TDS Filing' },
  ];
  documentOptions = [
    { key: 'panCardFile', label: 'PAN Card' },
    { key: 'aadhaarCardFile', label: 'Aadhaar Card' },
    { key: 'resumeFile', label: 'Resume' },
    { key: 'appointmentLetterFile', label: 'Appointment Letter' },
    { key: 'degreeCertificateFile', label: 'Degree Certificate' },
  ];

  staffForm: FormGroup = this.fb.group({
    employeeId: [this.generateEmployeeId(), [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    profilePhotoFile: [''],
    gender: [''],
    dateOfBirth: [''],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{5}\s?[0-9]{5}$/)]],
    personalEmail: ['', [Validators.email]],
    emergencyContactName: [''],
    emergencyContactMobile: [''],
    joiningDate: [''],
    designation: ['Senior Accountant'],
    department: ['Accounts'],
    employmentType: ['Full Time'],
    username: [''],
    email: ['', [Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    twoFactorEnabled: [false],
    accessRole: ['staff'],
    permissions: this.fb.group({
      clientManagement: [false],
      ledgerAccess: [true],
      invoiceAccess: [false],
      gstFiling: [false],
      payrollAccess: [false],
      reportsAccess: [true],
      staffManagement: [false],
    }),
    monthlySalary: [0],
    basicSalary: [0],
    allowances: [0],
    incentive: [0],
    pfEsi: [0],
    paymentMode: ['Bank Transfer'],
    accountHolderName: [''],
    bankName: ['HDFC Bank'],
    accountNumber: [''],
    ifscCode: [''],
    bankBranch: [''],
    panCardFile: [''],
    aadhaarCardFile: [''],
    resumeFile: [''],
    appointmentLetterFile: [''],
    degreeCertificateFile: [''],
    skills: this.fb.group({
      gstFiling: [false],
      incomeTaxReturn: [false],
      audit: [false],
      bookkeeping: [true],
      payroll: [false],
      tdsFiling: [false],
    }),
    reportingManager: [''],
    assignedClients: [''],
    branchOffice: ['Ahmedabad Head Office'],
    employmentStatus: ['Active'],
    isActive: [true],
  });

  @Input() set initialData(data: any) {
    if (data) {
      this.isEditMode.set(true);
      this.userId = data.id;
      this.patchFormFromUser(data);
      this.clearPasswordValidators();
    }
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.isEditMode.set(true);
      this.clearPasswordValidators();
      this.loadUser();
    }
  }

  private loadUser(): void {
    if (!this.userId) return;

    this.isLoadingData.set(true);
    this.userService.getUser(this.userId).subscribe({
      next: (response) => this.patchFormFromUser(response.data),
      error: () => {
        this.notificationService.error('Failed to load staff details');
        this.router.navigate(['/firm/staff']);
      },
      complete: () => this.isLoadingData.set(false),
    });
  }

  private patchFormFromUser(user: any): void {
    const profile = this.extractStaffProfile(user);
    const mobile = this.formatMobileForInput(user.mobile || '');

    this.staffForm.patchValue({
      employeeId: profile.employeeId || this.generateEmployeeId(),
      name: user.name || '',
      profilePhotoFile: profile.profilePhotoFile || '',
      gender: profile.gender || '',
      dateOfBirth: profile.dateOfBirth || '',
      mobile,
      personalEmail: profile.personalEmail || '',
      emergencyContactName: profile.emergencyContact?.name || profile.emergencyContactName || '',
      emergencyContactMobile: profile.emergencyContact?.mobile || profile.emergencyContactMobile || '',
      joiningDate: profile.joiningDate || '',
      designation: profile.designation || 'Senior Accountant',
      department: profile.department || 'Accounts',
      employmentType: profile.employmentType || 'Full Time',
      username: profile.username || '',
      email: user.email || '',
      twoFactorEnabled: Boolean(profile.twoFactorEnabled),
      accessRole: profile.accessRole || profile.role || this.accessRoleFromSystemRole(user.role),
      permissions: profile.permissions || {},
      monthlySalary: profile.salary?.monthlySalary ?? profile.monthlySalary ?? 0,
      basicSalary: profile.salary?.basicSalary ?? profile.salaryStructure?.basic ?? 0,
      allowances: profile.salary?.allowances ?? profile.salaryStructure?.allowances ?? 0,
      incentive: profile.salary?.incentive ?? profile.salaryStructure?.incentives ?? 0,
      pfEsi: profile.salary?.pfEsi ?? profile.salaryStructure?.deductions ?? 0,
      paymentMode: profile.salary?.paymentMode || profile.paymentMode || 'Bank Transfer',
      accountHolderName: profile.bank?.accountHolderName || profile.bankDetails?.accountHolderName || user.name || '',
      bankName: profile.bank?.bankName || profile.bankDetails?.bankName || 'HDFC Bank',
      accountNumber: profile.bank?.accountNumber || profile.bankDetails?.accountNumber || '',
      ifscCode: profile.bank?.ifscCode || profile.bankDetails?.ifsc || '',
      bankBranch: profile.bank?.branch || profile.bankDetails?.branch || '',
      panCardFile: profile.documents?.panCardFile || '',
      aadhaarCardFile: profile.documents?.aadhaarCardFile || '',
      resumeFile: profile.documents?.resumeFile || '',
      appointmentLetterFile: profile.documents?.appointmentLetterFile || '',
      degreeCertificateFile: profile.documents?.degreeCertificateFile || '',
      skills: profile.skillsMap || this.skillsArrayToMap(profile.skills),
      reportingManager: profile.reportingManager || '',
      assignedClients: Array.isArray(profile.assignedClients) ? profile.assignedClients.join(', ') : profile.assignedClients || '',
      branchOffice: profile.branchOffice || 'Ahmedabad Head Office',
      employmentStatus: profile.employmentStatus || 'Active',
      isActive: user.isActive ?? true,
    });
  }

  onSubmit(): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const formValue = this.staffForm.getRawValue();
    if (this.hasPasswordMismatch(formValue)) {
      this.passwordMismatch.set(true);
      return;
    }

    this.passwordMismatch.set(false);
    this.isSubmitting.set(true);

    const formData: any = {
      name: formValue.name,
      mobile: `+91${String(formValue.mobile).replace(/\s/g, '')}`,
      role: this.toSystemRole(formValue.accessRole),
      email: formValue.email || null,
      preferences: {
        staffProfile: this.buildStaffProfile(formValue),
      },
    };

    if (formValue.password) formData.password = formValue.password;
    if (this.isEditMode()) formData.isActive = formValue.isActive;

    const request$ = this.isEditMode()
      ? this.userService.updateUser(this.userId!, formData)
      : this.userService.createUser(formData);

    request$.subscribe({
      next: () => this.handleSuccessfulSave(),
      error: (error) => {
        this.isSubmitting.set(false);
        this.notificationService.error(error.error?.message || 'Error occurred during staff save');
      },
      complete: () => this.isSubmitting.set(false),
    });
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '').slice(0, 10);
    if (value.length > 5) value = `${value.slice(0, 5)} ${value.slice(5)}`;
    this.staffForm.get('mobile')?.setValue(value, { emitEvent: false });
  }

  onFileSelected(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.staffForm.get(controlName)?.setValue(file.name);
    }
  }

  onCancel(): void {
    if (this.isModal && this.closeCallback) {
      this.closeCallback();
    } else {
      this.router.navigate(['/firm/staff']);
    }
  }

  private handleSuccessfulSave(): void {
    this.notificationService.success(this.isEditMode() ? 'Staff Profile Updated Successfully' : 'New Staff Account Created');

    if (this.submitIntent() === 'another' && !this.isEditMode()) {
      this.resetForAnotherStaff();
      return;
    }

    if (this.isModal && this.closeCallback) {
      this.closeCallback();
      return;
    }

    const section = this.submitIntent() === 'assign' ? 'assignments' : 'directory';
    this.router.navigate(['/firm/staff'], { queryParams: { section } });
  }

  private resetForAnotherStaff(): void {
    this.staffForm.reset({
      employeeId: this.generateEmployeeId(),
      role: 'staff',
      designation: 'Senior Accountant',
      department: 'Accounts',
      employmentType: 'Full Time',
      accessRole: 'staff',
      paymentMode: 'Bank Transfer',
      bankName: 'HDFC Bank',
      branchOffice: 'Ahmedabad Head Office',
      employmentStatus: 'Active',
      isActive: true,
      monthlySalary: 0,
      basicSalary: 0,
      allowances: 0,
      incentive: 0,
      pfEsi: 0,
      twoFactorEnabled: false,
    });
    this.staffForm.get('permissions')?.patchValue({
      clientManagement: false,
      ledgerAccess: true,
      invoiceAccess: false,
      gstFiling: false,
      payrollAccess: false,
      reportsAccess: true,
      staffManagement: false,
    });
    this.staffForm.get('skills')?.patchValue({
      gstFiling: false,
      incomeTaxReturn: false,
      audit: false,
      bookkeeping: true,
      payroll: false,
      tdsFiling: false,
    });
  }

  private buildStaffProfile(formValue: any): any {
    return {
      employeeId: formValue.employeeId,
      profilePhotoFile: formValue.profilePhotoFile,
      gender: formValue.gender,
      dateOfBirth: formValue.dateOfBirth,
      personalEmail: formValue.personalEmail,
      emergencyContact: {
        name: formValue.emergencyContactName,
        mobile: formValue.emergencyContactMobile,
      },
      joiningDate: formValue.joiningDate,
      designation: formValue.designation,
      department: formValue.department,
      employmentType: formValue.employmentType,
      username: formValue.username,
      twoFactorEnabled: formValue.twoFactorEnabled,
      accessRole: formValue.accessRole,
      permissions: formValue.permissions,
      salary: {
        monthlySalary: Number(formValue.monthlySalary || 0),
        basicSalary: Number(formValue.basicSalary || 0),
        allowances: Number(formValue.allowances || 0),
        incentive: Number(formValue.incentive || 0),
        pfEsi: Number(formValue.pfEsi || 0),
        paymentMode: formValue.paymentMode,
      },
      bank: {
        accountHolderName: formValue.accountHolderName,
        bankName: formValue.bankName,
        accountNumber: formValue.accountNumber,
        ifscCode: formValue.ifscCode,
        branch: formValue.bankBranch,
      },
      documents: {
        panCardFile: formValue.panCardFile,
        aadhaarCardFile: formValue.aadhaarCardFile,
        resumeFile: formValue.resumeFile,
        appointmentLetterFile: formValue.appointmentLetterFile,
        degreeCertificateFile: formValue.degreeCertificateFile,
      },
      skillsMap: formValue.skills,
      assignedClients: this.csvToArray(formValue.assignedClients),
      reportingManager: formValue.reportingManager,
      branchOffice: formValue.branchOffice,
      employmentStatus: formValue.employmentStatus,
      smartFeatures: {
        employeeCodeAutoGenerated: true,
        offerLetterGeneratorReady: true,
        welcomeEmailCredentialsReady: true,
        defaultTaskAssignmentReady: true,
        trialPeriodTrackingReady: true,
        documentExpiryAlertsReady: true,
      },
    };
  }

  private extractStaffProfile(user: any): any {
    const preferences = user?.preferences || {};
    return {
      ...preferences,
      ...(preferences.staffProfile || {}),
    };
  }

  private clearPasswordValidators(): void {
    this.staffForm.get('password')?.clearValidators();
    this.staffForm.get('confirmPassword')?.clearValidators();
    this.staffForm.get('password')?.updateValueAndValidity();
    this.staffForm.get('confirmPassword')?.updateValueAndValidity();
  }

  private hasPasswordMismatch(formValue: any): boolean {
    if (!formValue.password && this.isEditMode()) return false;
    return formValue.password !== formValue.confirmPassword;
  }

  private formatMobileForInput(mobile: string): string {
    let value = mobile.startsWith('+91') ? mobile.substring(3) : mobile;
    value = value.replace(/\D/g, '').slice(0, 10);
    return value.length > 5 ? `${value.slice(0, 5)} ${value.slice(5)}` : value;
  }

  private toSystemRole(accessRole: string): 'admin' | 'accountant' | 'staff' {
    if (accessRole === 'super_admin' || accessRole === 'manager') return 'admin';
    if (accessRole === 'accountant') return 'accountant';
    return 'staff';
  }

  private accessRoleFromSystemRole(role: string): string {
    if (role === 'admin' || role === 'super_admin') return 'manager';
    if (role === 'accountant') return 'accountant';
    return 'staff';
  }

  private skillsArrayToMap(skills: unknown): Record<string, boolean> {
    const values = Array.isArray(skills) ? skills.map((skill) => String(skill).toLowerCase()) : [];
    return {
      gstFiling: values.some((skill) => skill.includes('gst')),
      incomeTaxReturn: values.some((skill) => skill.includes('income') || skill.includes('itr')),
      audit: values.some((skill) => skill.includes('audit')),
      bookkeeping: values.some((skill) => skill.includes('book') || skill.includes('ledger')),
      payroll: values.some((skill) => skill.includes('payroll')),
      tdsFiling: values.some((skill) => skill.includes('tds')),
    };
  }

  private csvToArray(value: string): string[] {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private generateEmployeeId(): string {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const suffix = Math.floor(100 + Math.random() * 900);
    return `EMP-${stamp}-${suffix}`;
  }
}
