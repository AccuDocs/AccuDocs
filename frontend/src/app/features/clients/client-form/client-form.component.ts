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
  
  // Password Visibility
  passwordVisible = signal(false);
  confirmPasswordVisible = signal(false);
  
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

  existingFiles = signal<{ [key: string]: string | null }>({
    identityProof: null,
    businessRegistration: null,
    taxCardCopy: null,
    previousReturn: null
  });

  // Form Progress Computed
  stepProgress = computed(() => {
    return (this.currentStep() / this.totalSteps) * 100;
  });

  // Using arrow functions to ensure exact context binding
  private passwordComplexityVal = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value || '';
    if (!value && this.isEditMode()) return null;
    if (!value) return { required: true };
    const hasUpper = /[A-Z]/.test(value);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    return hasUpper && hasSymbol ? null : { complexity: true };
  };

  private passwordMatchVal = (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password && this.isEditMode()) return null;
    return password === confirm ? null : { passwordMismatch: true };
  };

  clientForm: FormGroup = this.fb.group({
    // Step 1: Personal Details
    code: ['', [Validators.required]],
    name: ['', [Validators.required, (c: AbstractControl) => /^[a-zA-Z\s]*$/.test(c.value) ? null : { alphabetical: true }]],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{10,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordComplexityVal]],
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
  }, { validators: this.passwordMatchVal });

  @Input() set initialData(data: any) {
    if (data) {
      this.patchForm(data);
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

    // Conditional Entity Logic
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

  private patchForm(data: any): void {
    this.isEditMode.set(true);
    this.clientId = data.id;

    // Mobile Formatting
    let mobileValue = data.user?.mobile || data.mobile || '';
    if (mobileValue.startsWith('+91')) mobileValue = mobileValue.substring(3).trim();
    if (mobileValue.length === 10 && !mobileValue.includes(' ')) {
      mobileValue = mobileValue.substring(0, 5) + ' ' + mobileValue.substring(5);
    }

    // Robust Date Object Creation
    let incDate: Date | null = null;
    if (data.incorporationDate) {
      incDate = new Date(data.incorporationDate);
    }

    this.clientForm.patchValue({
      code: data.code,
      name: data.user?.name || data.name,
      email: data.user?.email || data.email,
      mobile: mobileValue,
      entityType: data.entityType || 'individual',
      businessName: data.businessName,
      industrySector: data.industrySector,
      incorporationDate: incDate,
      // Map 'address' from backend to 'businessAddress' control
      businessAddress: data.address || data.businessAddress,
      city: data.city,
      location: data.location,
      // Map pan or gstin to taxId control
      taxId: data.pan || data.gstin || data.taxId,
      // Map lowercased backend values back to frontend dropdowns
      gstStatus: data.gstStatus ? (data.gstStatus.charAt(0).toUpperCase() + data.gstStatus.slice(1)) : 'Unregistered',
      financialYearEnd: data.financialYearEnd || 'march_31',
      accountingMethod: data.accountingMethod === 'cash' ? 'Cash Basis' : (data.accountingMethod === 'accrual' ? 'Accrual Basis' : 'Cash Basis'),
      estimatedTurnover: data.estimatedTurnover,
      employeeCount: data.employeeCount,
      termsAccepted: true
    }, { emitEvent: true });

    // Map existing document URLs
    this.existingFiles.set({
      identityProof: data.identityProofUrl || null,
      businessRegistration: data.businessRegistrationUrl || null,
      taxCardCopy: data.taxCardCopyUrl || null,
      previousReturn: data.previousYearReturnUrl || null
    });

    this.clientForm.get('code')?.disable();
    
    // In edit mode, passwords are not mandatory initially
    this.clientForm.get('password')?.clearValidators();
    this.clientForm.get('password')?.updateValueAndValidity();
    this.clientForm.get('confirmPassword')?.clearValidators();
    this.clientForm.get('confirmPassword')?.updateValueAndValidity();
    this.clientForm.updateValueAndValidity();
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      const controls = this.getStepControls(this.currentStep());
      controls.forEach(c => {
        const ctrl = this.clientForm.get(c);
        ctrl?.markAsTouched();
        ctrl?.markAsDirty();
        ctrl?.updateValueAndValidity();
      });
      this.clientForm.updateValueAndValidity();

      if (this.isStepValid(this.currentStep())) {
        this.currentStep.update(s => s + 1);
      } else {
        const failures = controls.filter(c => this.clientForm.get(c)?.invalid);
        console.error('Validation Blocked!', failures);
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
    const controlsValid = controls.every(c => {
      const ctrl = this.clientForm.get(c);
      return ctrl?.valid || ctrl?.disabled;
    });
    
    if (step === 1 && controlsValid) {
      const passVal = this.clientForm.get('password')?.value;
      if (!passVal && this.isEditMode()) return true;
      return !this.clientForm.hasError('passwordMismatch');
    }

    return controlsValid;
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

  private loadClient(): void {
    if (!this.clientId) return;
    this.isLoadingData.set(true);
    this.clientService.getClient(this.clientId).subscribe({
      next: (res) => {
        const clientData = res.data?.client || res.data || res;
        this.patchForm(clientData);
      },
      error: () => this.notificationService.error('Failed to load profile'),
      complete: () => this.isLoadingData.set(false)
    });
  }

  private loadNextCode(): void {
    this.clientService.getNextCode().subscribe({
      next: (res) => this.clientForm.patchValue({ code: res.data.code }),
    });
  }

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

  onSubmit(): void {
    if (this.clientForm.invalid) return;

    this.isSubmitting.set(true);
    const formValue = this.clientForm.getRawValue();
    
    // Explicit payload mapping for backend to prevent data loss
    const payload = {
      code: formValue.code,
      name: formValue.name,
      email: formValue.email,
      mobile: `+91${formValue.mobile.replace(/\D/g, '')}`,
      entityType: formValue.entityType,
      businessName: formValue.businessName,
      industrySector: formValue.industrySector,
      incorporationDate: formValue.incorporationDate,
      address: formValue.businessAddress,
      city: formValue.city,
      location: formValue.location,
      taxId: formValue.taxId,
      pan: formValue.taxId,
      gstin: formValue.taxId,
      gstStatus: formValue.gstStatus?.toLowerCase(),
      financialYearEnd: formValue.financialYearEnd,
      accountingMethod: formValue.accountingMethod?.toLowerCase().includes('cash') ? 'cash' : 'accrual',
      estimatedTurnover: formValue.estimatedTurnover,
      employeeCount: formValue.employeeCount,
      termsAccepted: formValue.termsAccepted,
      isActive: true,
      ...(formValue.password ? { password: formValue.password } : {}),
      // Include KYC Files
      identityProofFile: this.files()['identityProof'],
      businessRegistrationFile: this.files()['businessRegistration'],
      taxCardCopyFile: this.files()['taxCardCopy'],
      previousYearReturnFile: this.files()['previousReturn']
    };

    const request$ = this.isEditMode()
      ? this.clientService.updateClient(this.clientId as string, payload as any)
      : this.clientService.createClient(payload as any);

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
    this.clientForm.get('mobile')?.setValue(value, { emitEvent: true });
  }

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
  
  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.passwordVisible.update(v => !v);
    } else {
      this.confirmPasswordVisible.update(v => !v);
    }
  }
}
