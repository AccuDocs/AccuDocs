import { Component, inject, signal, OnInit, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClientService } from '@core/services/client.service';
import { NotificationService } from '@core/services/notification.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './client-form.component.html',
  styleUrls: ['./client-form.component.scss'],
  animations: [
    trigger('stepAnimation', [
      transition(':increment', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(20px)' }),
          animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
        ], { optional: true })
      ]),
      transition(':decrement', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
        ], { optional: true })
      ])
    ]),
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(10px)' }),
          stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
        ], { optional: true })
      ])
    ])
  ]
})
export class ClientFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Wizard State
  currentStep = signal(1);
  totalSteps = 4;
  isEditMode = signal(false);
  isLoadingData = signal(false);
  isSubmitting = signal(false);
  isDraftSaving = signal(false);
  private clientId: string | null = null;

  @Input() isModal = false;
  @Input() closeCallback?: () => void;

  // Dropdown Options
  entityTypes = [
    { value: 'individual', label: 'Individual / Freelancer', icon: 'person' },
    { value: 'proprietorship', label: 'Sole Proprietorship', icon: 'storefront' },
    { value: 'partnership', label: 'Partnership Firm', icon: 'groups' },
    { value: 'pvt_ltd', label: 'Private Limited Company', icon: 'business' },
    { value: 'pub_ltd', label: 'Public Limited Company', icon: 'domain' },
    { value: 'llp', label: 'LLP (Limited Liability Partnership)', icon: 'account_balance' },
    { value: 'trust_ngo', label: 'Trust / NGO', icon: 'volunteer_activism' }
  ];

  industrySectors = [
    'IT & Software', 'Retail & E-commerce', 'Manufacturing', 'Healthcare/Medical',
    'Real Estate/Construction', 'Hospitality/Tourism', 'Professional Services', 'Other'
  ];

  gstStatuses = ['Registered', 'Unregistered', 'Exempted'];
  financialYearEnds = [
    { value: 'march_31', label: 'March 31st' },
    { value: 'december_31', label: 'December 31st' },
    { value: 'other', label: 'Other (Custom Date)' }
  ];
  accountingMethods = ['Cash Basis', 'Accrual Basis'];
  turnoverRanges = [
    'Under $100k (or ₹10L)', '$100k - $500k (or ₹10L - ₹50L)',
    '$500k - $1M (or ₹50L - ₹1Cr)', 'Over $1M (or ₹1Cr+)'
  ];
  employeeRanges = ['1 (Self)', '2 - 10', '11 - 50', '51 - 200', '200+'];

  // File states
  files = signal<{ [key: string]: File | null }>({
    identityProof: null,
    businessRegistration: null,
    taxCardCopy: null,
    previousReturn: null
  });

  // Form Progress Computed
  stepProgress = computed(() => {
    return (this.currentStep() / this.totalSteps) * 100;
  });

  clientForm: FormGroup = this.fb.group({
    // Step 1: Personal Details
    code: ['', [Validators.required]],
    name: ['', [Validators.required, this.alphabeticalValidator]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{5}\s?[0-9]{5}$|^[0-9]{10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordComplexityValidator]],
    confirmPassword: ['', [Validators.required]],

    // Step 2: Business & Entity Profile
    entityType: ['individual', [Validators.required]],
    businessName: [''],
    industrySector: ['', [Validators.required]],
    incorporationDate: [null],
    businessAddress: ['', [Validators.required]],
    city: ['', [Validators.required]],
    location: ['', [Validators.required]],

    // Step 3: Tax & Compliance
    taxId: ['', [Validators.required]],
    gstStatus: ['Unregistered', [Validators.required]],
    financialYearEnd: ['march_31', [Validators.required]],
    accountingMethod: ['Cash Basis', [Validators.required]],
    estimatedTurnover: ['', [Validators.required]],
    employeeCount: ['', [Validators.required]],

    // Step 4: KYC & Extra
    termsAccepted: [false, [Validators.requiredTrue]]
  }, { validators: this.passwordMatchValidator });

  // Modal Input
  @Input() set initialData(data: any) {
    if (data) {
      this.isEditMode.set(true);
      this.clientId = data.id;
      
      // Strip +91 from mobile for UI
      let mobile = data.user?.mobile || data.mobile || '';
      if (mobile.startsWith('+91')) {
        mobile = mobile.substring(3).trim();
      }
      if (mobile.length > 5) {
        mobile = mobile.substring(0, 5) + ' ' + mobile.substring(5);
      }

      this.clientForm.patchValue({
        code: data.code,
        name: data.user?.name || data.name,
        email: data.user?.email || data.email,
        mobile: mobile,
        entityType: data.entityType || 'individual',
        businessName: data.businessName,
        industrySector: data.industrySector,
        incorporationDate: data.incorporationDate,
        businessAddress: data.address,
        city: data.city,
        location: data.location,
        taxId: data.pan || data.gstin,
        gstStatus: data.gstStatus || 'Unregistered',
        financialYearEnd: data.financialYearEnd || 'march_31',
        accountingMethod: data.accountingMethod || 'Cash Basis',
        estimatedTurnover: data.estimatedTurnover,
        employeeCount: data.employeeCount,
        termsAccepted: true
      });

      this.clientForm.get('code')?.disable();
      // Remove password requirement in edit mode if not changing it
      this.clientForm.get('password')?.clearValidators();
      this.clientForm.get('password')?.updateValueAndValidity();
      this.clientForm.get('confirmPassword')?.clearValidators();
      this.clientForm.get('confirmPassword')?.updateValueAndValidity();
    }
  }

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.clientId = routeId;
      this.isEditMode.set(true);
      this.loadClient();
    } else if (!this.clientForm.get('code')?.value) {
      this.loadNextCode();
    }

    // Conditional logic for Entity Type
    this.clientForm.get('entityType')?.valueChanges.subscribe(type => {
      const busName = this.clientForm.get('businessName');
      const incDate = this.clientForm.get('incorporationDate');
      
      if (type === 'individual') {
        busName?.clearValidators();
        incDate?.clearValidators();
      } else {
        busName?.setValidators([Validators.required]);
        incDate?.setValidators([Validators.required]);
      }
      busName?.updateValueAndValidity();
      incDate?.updateValueAndValidity();
    });
  }

  // Validators
  private alphabeticalValidator(control: AbstractControl): ValidationErrors | null {
    const valid = /^[a-zA-Z\s]*$/.test(control.value);
    return valid ? null : { alphabetical: true };
  }

  private passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    const hasUpper = /[A-Z]/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    return hasUpper && hasSymbol ? null : { complexity: true };
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  // Navigation
  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      if (this.isStepValid(this.currentStep())) {
        this.currentStep.update(s => s + 1);
      } else {
        this.markStepTouched(this.currentStep());
        this.notificationService.warning('Please complete all required fields correctly.');
      }
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  isStepValid(step: number): boolean {
    const controls = this.getStepControls(step);
    return controls.every(c => this.clientForm.get(c)?.valid);
  }

  private markStepTouched(step: number): void {
    this.getStepControls(step).forEach(c => this.clientForm.get(c)?.markAsTouched());
  }

  private getStepControls(step: number): string[] {
    switch (step) {
      case 1: return ['code', 'name', 'email', 'mobile', 'password', 'confirmPassword'];
      case 2: return ['entityType', 'businessName', 'industrySector', 'incorporationDate', 'businessAddress', 'city', 'location'];
      case 3: return ['taxId', 'gstStatus', 'financialYearEnd', 'accountingMethod', 'estimatedTurnover', 'employeeCount'];
      case 4: return ['termsAccepted'];
      default: return [];
    }
  }

  // Data Loading
  private loadClient(): void {
    if (!this.clientId) return;
    this.isLoadingData.set(true);
    this.clientService.getClient(this.clientId).subscribe({
      next: (res) => this.initialData = res.data,
      error: () => this.notificationService.error('Failed to load client data'),
      complete: () => this.isLoadingData.set(false)
    });
  }

  private loadNextCode(): void {
    this.clientService.getNextCode().subscribe({
      next: (res) => this.clientForm.patchValue({ code: res.data.code }),
    });
  }

  // File Handling
  onFileChange(event: any, field: string): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error('File size exceeds 5MB limit.');
        event.target.value = '';
        return;
      }
      this.files.update(f => ({ ...f, [field]: file }));
    }
  }

  // Actions
  onSaveAsDraft(): void {
    this.isDraftSaving.set(true);
    // Simulate draft saving
    setTimeout(() => {
      this.isDraftSaving.set(false);
      this.notificationService.success('Draft saved successfully!');
    }, 1200);
  }

  onSubmit(): void {
    if (this.clientForm.invalid) return;

    this.isSubmitting.set(true);
    const formValue = this.clientForm.getRawValue();
    
    // Cleanup data for backend
    const formData = {
      ...formValue,
      mobile: `+91${formValue.mobile.replace(/\s/g, '')}`,
      address: formValue.businessAddress,
      pan: formValue.taxId, // Simple mapping for now
      gstin: formValue.taxId
    };

    // In a real scenario, we would use FormData for file uploads
    const request$ = this.isEditMode()
      ? this.clientService.updateClient(this.clientId!, formData)
      : this.clientService.createClient(formData);

    request$.subscribe({
      next: () => {
        this.notificationService.success(this.isEditMode() ? 'Client updated' : 'Client created');
        this.isModal ? this.closeCallback?.() : this.router.navigate(['/clients']);
      },
      error: () => this.isSubmitting.set(false),
      complete: () => this.isSubmitting.set(false)
    });
  }

  onCancel(): void {
    this.isModal ? this.closeCallback?.() : this.router.navigate(['/clients']);
  }

  onMobileInput(event: any): void {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    if (value.length > 5) value = value.substring(0, 5) + ' ' + value.substring(5);
    this.clientForm.get('mobile')?.setValue(value, { emitEvent: false });
  }

  // Helpers
  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'Personal & Security Details';
      case 2: return 'Business & Entity Profile';
      case 3: return 'Tax & Compliance Strategy';
      case 4: return 'KYC Document Verification';
      default: return '';
    }
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.clientForm.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }
}
