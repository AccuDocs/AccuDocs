import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize, timeout } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { WorkspaceService, WorkspaceTree, FolderNode, FileNode, Breadcrumb } from '@core/services/workspace.service';
import { ToastService } from '@core/services/toast.service';
import { ButtonComponent } from '@ui/atoms/button.component';
import { CardComponent } from '@ui/molecules/card.component';
import { LoaderComponent } from '@ui/atoms/loader.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroFolderSolid,
  heroFolderOpenSolid,
  heroDocumentSolid,
  heroDocumentTextSolid,
  heroPhotoSolid,
  heroArrowDownTraySolid,
  heroTrashSolid,
  heroPencilSquareSolid,
  heroArrowUpTraySolid,
  heroChevronRightSolid,
  heroHomeSolid,
  heroXMarkSolid,
  heroEyeSolid,
  heroArrowsPointingOutSolid,
  heroTableCellsSolid,
  heroArchiveBoxSolid,
  heroPlusSolid,
  heroArrowPathSolid,
  heroFolderPlusSolid,
  heroEllipsisVerticalSolid,
  heroTruckSolid,
  heroBanknotesSolid,
  heroCreditCardSolid
} from '@ng-icons/heroicons/solid';

// File Explorer specific imports
import { FileViewToolbarComponent } from '../../file-explorer/components/file-view-toolbar/file-view-toolbar.component';
import { FileGridComponent } from '../../file-explorer/components/file-grid/file-grid.component';
import { FileListComponent } from '../../file-explorer/components/file-list/file-list.component';
import { FileDetailsComponent } from '../../file-explorer/components/file-details/file-details.component';
import { DetailsPaneComponent } from '../../file-explorer/components/details-pane/details-pane.component';
import { PreviewPaneComponent } from '../../file-explorer/components/preview-pane/preview-pane.component';
import { ViewPreferenceService } from '../../file-explorer/services/view-preference.service';
import { FileItem } from '../../file-explorer/models/file-explorer.models';
import { MatIconModule } from '@angular/material/icon';
import { ClientWorkspaceContextService } from '@core/services/client-workspace-context.service';
import { ChecklistsComponent } from '../components/checklists/checklists.component';
import { ClientDeadlinesComponent } from '../components/client-deadlines/client-deadlines.component';
import { DataModuleComponent } from '../components/data-module/data-module.component';
import { GstSummaryComponent } from '../components/gst-summary/gst-summary.component';
import { ClientDashboardComponent } from '../components/client-dashboard/client-dashboard.component';
import { heroClipboardDocumentCheckSolid, heroCalendarSolid, heroChartBarSolid, heroReceiptPercentSolid, heroPresentationChartBarSolid } from '@ng-icons/heroicons/solid';

import { ClientBillingComponent } from '../components/client-billing/client-billing.component';
import { ClientInventoryComponent } from '../components/client-inventory/client-inventory.component';
import { AccountingFinanceComponent } from '../components/accounting-finance/accounting-finance.component';
import { BankingPaymentsComponent } from '../components/banking-payments/banking-payments.component';
import { PayrollHrComponent } from '../components/payroll-hr/payroll-hr.component';
import { VendorManagementComponent } from '../../vendors/vendor-management/vendor-management.component';

export type WorkspaceTab = 'files' | 'checklists' | 'deadlines' | 'data' | 'gst' | 'billing' | 'accounting' | 'banking' | 'payroll' | 'vendors' | 'dashboard' | 'inventory';

@Component({
  selector: 'app-client-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    LoaderComponent,
    LoadingStateComponent,
    NgIconComponent,
    FileViewToolbarComponent,
    FileGridComponent,
    FileListComponent,
    FileDetailsComponent,
    DetailsPaneComponent,
    PreviewPaneComponent,
    MatIconModule,
    ChecklistsComponent,
    ClientDeadlinesComponent,
    DataModuleComponent,
    GstSummaryComponent,
    ClientDashboardComponent,
    ClientBillingComponent,
    ClientInventoryComponent,
    AccountingFinanceComponent,
    BankingPaymentsComponent,
    PayrollHrComponent,
    VendorManagementComponent
  ],
  providers: [
    provideIcons({
      heroFolderSolid,
      heroFolderOpenSolid,
      heroDocumentSolid,
      heroDocumentTextSolid,
      heroPhotoSolid,
      heroArrowDownTraySolid,
      heroTrashSolid,
      heroPencilSquareSolid,
      heroArrowUpTraySolid,
      heroChevronRightSolid,
      heroHomeSolid,
      heroXMarkSolid,
      heroEyeSolid,
      heroArrowsPointingOutSolid,
      heroTableCellsSolid,
      heroArchiveBoxSolid,
      heroPlusSolid,
      heroArrowPathSolid,
      heroFolderPlusSolid,
      heroEllipsisVerticalSolid,
      heroTruckSolid,
      heroBanknotesSolid,
      heroCreditCardSolid,
      heroClipboardDocumentCheckSolid,
      heroCalendarSolid,
      heroChartBarSolid,
      heroReceiptPercentSolid,
      heroPresentationChartBarSolid
    })
  ],
  template: `
    <div class="client-workspace-shell px-6 pt-3 pb-6 h-full flex flex-col animate-in fade-in duration-500">
      <input
        #fileInput
        type="file"
        multiple
        class="hidden"
        (change)="onFilesSelected($event)"
      />

      <!-- Loading State -->
      @if (isLoading()) {
        <app-loading-state label="Loading workspace..."></app-loading-state>
      } @else if (workspace()) {
      @if (workspaceLoadError()) {
        <section class="mb-3 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{{ workspaceLoadError() }}</span>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 font-semibold text-amber-900 transition hover:bg-amber-100"
              (click)="refresh()"
            >
              <ng-icon name="heroArrowPathSolid" size="14"></ng-icon>
              Retry
            </button>
          </div>
        </section>
      }
      <!-- Workspace Path Breadcrumbs -->
      <section class="mb-2 shrink-0">
        <nav class="flex items-center gap-1 text-sm">
          <button
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-text-secondary hover:text-primary-600 transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800"
            (click)="navigateToRoot()"
          >
            <ng-icon name="heroHomeSolid" size="16" class="text-primary-500"></ng-icon>
            <span class="tracking-tight uppercase text-[11px]">{{ workspace()?.clientCode }}</span>
          </button>
          
          @for (crumb of breadcrumbs(); track crumb.id; let last = $last) {
            <div class="flex items-center gap-1">
              <ng-icon name="heroChevronRightSolid" size="12" class="text-text-secondary/30"></ng-icon>
              <button
                [class]="last ? 'border-primary-500 text-primary-600 font-bold' : 'border-transparent text-text-secondary hover:text-primary-600 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800'"
                class="px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 border"
                (click)="!last && navigateToFolder(crumb.id)"
              >
                @if (last) {
                  <div class="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                }
                {{ crumb.name }}
              </button>
            </div>
          }
        </nav>
      </section>



      @if (activeTab() === 'checklists') {
        <app-checklists [clientId]="workspace()?.clientId || ''"></app-checklists>
      } @else if (activeTab() === 'deadlines') {
        <app-client-deadlines 
          [clientId]="workspace()?.clientId || ''"
          (tabChangeRequested)="onTabChangeRequested($event)"
        ></app-client-deadlines>
      } @else if (activeTab() === 'data') {
        <app-data-module 
          [clientId]="workspace()?.clientId || ''"
          [rootFolder]="workspace()?.rootFolder || null"
          (tabChangeRequested)="onTabChangeRequested($event)"
          (folderNavigationRequested)="onFolderNavigationRequested($event)"
        ></app-data-module>
      } @else if (activeTab() === 'gst') {
        <app-gst-summary 
          [clientId]="workspace()?.clientId || ''"
          [rootFolder]="workspace()?.rootFolder || null"
          (folderNavigationRequested)="onFolderNavigationRequested($event)"
        ></app-gst-summary>
      } @else if (activeTab() === 'billing') {
        <app-client-billing [clientId]="workspace()?.clientId || ''"></app-client-billing>
      } @else if (activeTab() === 'accounting') {
        <div class="no-scrollbar min-h-0 flex-1 overflow-auto">
          <app-accounting-finance [clientId]="workspace()?.clientId || ''"></app-accounting-finance>
        </div>
      } @else if (activeTab() === 'banking') {
        <div class="no-scrollbar min-h-0 flex-1 overflow-auto">
          <app-banking-payments [clientId]="workspace()?.clientId || ''"></app-banking-payments>
        </div>
      } @else if (activeTab() === 'payroll') {
        <div class="no-scrollbar min-h-0 flex-1 overflow-auto">
          <app-payroll-hr [clientId]="workspace()?.clientId || ''"></app-payroll-hr>
        </div>
      } @else if (activeTab() === 'vendors') {
        <div class="no-scrollbar min-h-0 flex-1 overflow-auto">
          <app-vendor-management [clientId]="workspace()?.clientId || null"></app-vendor-management>
        </div>
      } @else if (activeTab() === 'inventory') {
        <div class="no-scrollbar min-h-0 flex-1 overflow-auto">
          <app-client-inventory class="block min-h-full" [clientId]="workspace()?.clientId || ''"></app-client-inventory>
        </div>
      } @else if (activeTab() === 'dashboard') {
        <app-client-dashboard [clientId]="workspace()?.clientId || ''"></app-client-dashboard>
      } @else {
      <!-- Main Content Grid -->
      <section class="files-module flex min-h-0 flex-1 flex-col gap-5">
        <div class="flex-1 grid grid-cols-12 gap-5 items-stretch min-h-0">
          <!-- Folder Tree Sidebar -->
          <aside class="col-span-12 lg:col-span-3 flex flex-col min-h-0">
            <section class="files-tree-card flex-1 flex flex-col min-h-0">
              <div class="files-tree-header">
                <div>
                  <span class="files-panel-label">Folder tree</span>
                  <h3>
                    <ng-icon name="heroFolderSolid" size="18"></ng-icon>
                    Workspace Structure
                  </h3>
                </div>
                <span class="files-count-pill">{{ workspace()?.rootFolder?.children?.length || 0 }}</span>
              </div>
              <div class="files-tree-meta">
                <span>{{ workspace()?.clientCode || 'Client' }}</span>
                <span>{{ formatTotalSize(workspace()?.rootFolder?.totalSize || 0) }}</span>
              </div>
              <div class="flex-1 overflow-y-auto no-scrollbar p-3">
                @if (workspace()?.rootFolder) {
                  <ng-container *ngTemplateOutlet="folderTree; context: { folder: workspace()!.rootFolder, level: 0 }"></ng-container>
                }
              </div>
            </section>
          </aside>

          <!-- File Explorer Main Area -->
          <main [class]="(viewState$ | async)?.showPreview || (viewState$ | async)?.showDetails ? 'col-span-12 lg:col-span-6' : 'col-span-12 lg:col-span-9'" class="flex flex-col min-h-0">
            <section class="files-browser-card flex-1 flex flex-col min-h-0">
              <!-- Toolbar Integration -->
              <div class="files-browser-toolbar">
                <app-file-view-toolbar 
                  [canGoBack]="breadcrumbs().length > 0"
                  (refreshClicked)="refresh()"
                  (newFolderClicked)="triggerFolderCreate()"
                  (uploadClicked)="triggerUpload()"
                  (backClicked)="goBack()">
                </app-file-view-toolbar>
              </div>

              <!-- Explorer Address Bar -->
              <div class="explorer-address-row">
                <div class="explorer-address-bar">
                  <button type="button" class="address-segment" (click)="navigateToRoot()">
                    <ng-icon name="heroHomeSolid" size="15"></ng-icon>
                    <span>{{ workspace()?.rootFolder?.name || workspace()?.clientCode || 'Workspace' }}</span>
                  </button>
                  @for (crumb of breadcrumbs(); track crumb.id; let last = $last) {
                    <ng-icon name="heroChevronRightSolid" size="12" class="address-chevron"></ng-icon>
                    <button
                      type="button"
                      class="address-segment"
                      [class.is-current]="last"
                      (click)="!last && navigateToFolder(crumb.id)"
                    >
                      {{ crumb.name }}
                    </button>
                  }
                </div>
                <div class="explorer-search-box">
                  <mat-icon>search</mat-icon>
                  <span>Search {{ currentFolder()?.name || 'workspace' }}</span>
                </div>
              </div>

              <div class="explorer-info-strip">
                <div class="min-w-0">
                  <h2 class="truncate">{{ currentFolder()?.name || 'Root' }}</h2>
                  <p>
                    {{ fileItems().length }} items
                    @if (currentFolder()?.folderCount || currentFolder()?.children?.length) {
                      &middot; {{ currentFolder()?.folderCount || currentFolder()?.children?.length }} folders
                    }
                    @if (currentFolder()?.fileCount) {
                      &middot; {{ currentFolder()?.fileCount }} files
                    }
                  </p>
                </div>
                <span>{{ formatTotalSize(currentFolder()?.totalSize || 0) }}</span>
              </div>

              <!-- Upload Progress -->
              @if (uploadProgress() > 0 && uploadProgress() < 100) {
                <div class="files-upload-progress">
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-text-primary">Uploading...</span>
                        <span class="text-text-secondary">{{ uploadProgress() }}%</span>
                      </div>
                      <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
                          [style.width.%]="uploadProgress()"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- View Content Area -->
              <div class="files-content flex-1 overflow-auto no-scrollbar" [ngSwitch]="(viewState$ | async)?.viewMode">
                @if (fileItems().length > 0) {
                  <!-- Grid Views (Extra Large, Large, Medium, Small) -->
                  <app-file-grid
                    *ngSwitchCase="'extra-large'"
                    [files]="fileItems()"
                    viewMode="extra-large"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                    (fileRenamed)="onFileRenamed($event)"
                    (filePreviewed)="onFilePreviewed($event)"
                    (fileDownloaded)="onFileDownloaded($event)"
                    (fileDeleted)="onFileDeleted($event)"
                  ></app-file-grid>
                  <app-file-grid
                    *ngSwitchCase="'large'"
                    [files]="fileItems()"
                    viewMode="large"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                    (fileRenamed)="onFileRenamed($event)"
                    (filePreviewed)="onFilePreviewed($event)"
                    (fileDownloaded)="onFileDownloaded($event)"
                    (fileDeleted)="onFileDeleted($event)"
                  ></app-file-grid>
                  <app-file-grid
                    *ngSwitchCase="'medium'"
                    [files]="fileItems()"
                    viewMode="medium"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                    (fileRenamed)="onFileRenamed($event)"
                    (filePreviewed)="onFilePreviewed($event)"
                    (fileDownloaded)="onFileDownloaded($event)"
                    (fileDeleted)="onFileDeleted($event)"
                  ></app-file-grid>
                  <app-file-grid
                    *ngSwitchCase="'small'"
                    [files]="fileItems()"
                    viewMode="small"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                    (fileRenamed)="onFileRenamed($event)"
                    (filePreviewed)="onFilePreviewed($event)"
                    (fileDownloaded)="onFileDownloaded($event)"
                    (fileDeleted)="onFileDeleted($event)"
                  ></app-file-grid>

                  <!-- List View -->
                  <app-file-list
                    *ngSwitchCase="'list'"
                    [files]="fileItems()"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                  ></app-file-list>

                  <!-- Details View -->
                  <app-file-details
                    *ngSwitchCase="'details'"
                    [files]="fileItems()"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                  ></app-file-details>

                  <!-- Tiles & Content (Mapped to Grid for now) -->
                  <app-file-grid
                    *ngSwitchCase="'tiles'"
                    [files]="fileItems()"
                    viewMode="medium"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                    (fileRenamed)="onFileRenamed($event)"
                    (filePreviewed)="onFilePreviewed($event)"
                    (fileDownloaded)="onFileDownloaded($event)"
                    (fileDeleted)="onFileDeleted($event)"
                  ></app-file-grid>
                  <app-file-grid
                    *ngSwitchCase="'content'"
                    [files]="fileItems()"
                    viewMode="large"
                    (fileSelected)="onFileSelected($event)"
                    (fileOpened)="onFileOpened($event)"
                    (fileRenamed)="onFileRenamed($event)"
                    (filePreviewed)="onFilePreviewed($event)"
                    (fileDownloaded)="onFileDownloaded($event)"
                    (fileDeleted)="onFileDeleted($event)"
                  ></app-file-grid>
                } @else {
                  <!-- Empty State -->
                  <div class="files-empty-state">
                    <div class="files-empty-icon">
                      <mat-icon>folder_open</mat-icon>
                    </div>
                    <h3>This folder is empty</h3>
                    <p>
                      Drag and drop files here to upload or use the upload button above.
                    </p>
                    <app-button variant="primary" size="md" (clicked)="triggerUpload()">
                      <ng-icon name="heroArrowUpTraySolid" class="mr-2" size="18"></ng-icon>
                      Upload Files
                    </app-button>
                  </div>
                }
              </div>

              <!-- Status Bar -->
              <footer class="files-status-bar">
                <div class="flex items-center gap-4">
                  <span>{{ fileItems().length }} items</span>
                  @if (selectedFile()) {
                    <span class="text-primary-600 font-medium">1 item selected</span>
                  }
                </div>
                <div class="flex items-center gap-3">
                  <button class="hover:text-primary-600 transition-colors" title="List View" (click)="viewService.updateViewMode('list')">
                    <mat-icon class="text-lg h-5 w-5">view_list</mat-icon>
                  </button>
                  <button class="hover:text-primary-600 transition-colors" title="Details View" (click)="viewService.updateViewMode('details')">
                    <mat-icon class="text-lg h-5 w-5">view_headline</mat-icon>
                  </button>
                  <div class="w-px h-3 bg-gray-300 mx-1"></div>
                  <button class="hover:text-primary-600 transition-colors" title="Grid View" (click)="viewService.updateViewMode('large')">
                    <mat-icon class="text-lg h-5 w-5">grid_view</mat-icon>
                  </button>
                </div>
              </footer>
            </section>
          </main>

          <!-- Side Panes -->
          @if ((viewState$ | async)?.showPreview) {
            <aside class="col-span-12 lg:col-span-3 transition-all duration-300 animate-in slide-in-from-right-4">
              <app-card [padding]="false" class="h-full">
                <app-preview-pane [selectedFile]="selectedFile()"></app-preview-pane>
              </app-card>
            </aside>
          }

          @if ((viewState$ | async)?.showDetails) {
            <aside class="col-span-12 lg:col-span-3 transition-all duration-300 animate-in slide-in-from-right-4">
              <app-card [padding]="false" class="h-full">
                <app-details-pane [selectedFile]="selectedFile()"></app-details-pane>
              </app-card>
            </aside>
          }
        </div>
      </section>
      }
      } @else {
        <section class="flex flex-1 items-center justify-center p-6">
          <div class="w-full max-w-lg rounded-lg border border-border-color bg-surface p-6 text-center shadow-sm">
            <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <ng-icon name="heroFolderOpenSolid" size="24"></ng-icon>
            </div>
            <h2 class="text-lg font-bold text-text-primary">Workspace unavailable</h2>
            <p class="mt-2 text-sm text-text-secondary">
              {{ workspaceLoadError() || 'The client workspace could not be loaded.' }}
            </p>
            <button
              type="button"
              class="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
              (click)="refresh()"
            >
              <ng-icon name="heroArrowPathSolid" size="16"></ng-icon>
              Retry
            </button>
          </div>
        </section>
      }

      <!-- Rename Modal -->
      @if (showRenameModal()) {
        <!-- Premium Backdrop -->
        <div class="modal-overlay-premium" (click)="closeRenameModal()" aria-hidden="true"></div>
        
        <!-- Modal Container -->
        <div class="fixed inset-0 flex items-center justify-center p-4" style="z-index: var(--z-modal);" (click)="closeRenameModal()">
          <div class="modal-panel-premium w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="p-6 border-b border-border-color">
              <h3 class="text-lg font-bold text-text-primary">Rename File</h3>
            </div>
            <div class="p-6">
              <input
                type="text"
                [(ngModel)]="newFileName"
                class="form-input"
                placeholder="Enter new file name"
                (keyup.enter)="confirmRename()"
              />
            </div>
            <div class="p-6 border-t border-border-color flex justify-end gap-3">
              <app-button variant="secondary" size="md" (clicked)="closeRenameModal()">Cancel</app-button>
              <app-button variant="primary" size="md" (clicked)="confirmRename()">Rename</app-button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <!-- Premium Backdrop -->
        <div class="modal-overlay-premium" (click)="closeDeleteModal()" aria-hidden="true"></div>

        <!-- Modal Container -->
        <div class="fixed inset-0 flex items-center justify-center p-4" style="z-index: var(--z-modal);" (click)="closeDeleteModal()">
          <div class="modal-panel-premium w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="p-6 border-b border-border-color">
              <h3 class="text-lg font-bold text-text-primary">Delete File</h3>
            </div>
            <div class="p-6">
              <p class="text-text-secondary">
                Are you sure you want to delete <strong class="text-text-primary">{{ fileToDelete()?.originalName }}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div class="p-6 border-t border-border-color flex justify-end gap-3">
              <app-button variant="secondary" size="md" (clicked)="closeDeleteModal()">Cancel</app-button>
              <app-button variant="danger" size="md" (clicked)="confirmDelete()">Delete</app-button>
            </div>
          </div>
        </div>
      }

      <!-- Preview Modal -->
      @if (showPreviewModal()) {
        <div class="fixed inset-0 bg-black/90 z-modal-backdrop flex flex-col" (click)="closePreviewModal()">
          <div class="flex items-center justify-between p-4 text-white">
            <div class="flex items-center gap-3">
              <ng-icon [name]="isPdf(fileToPreview()?.mimeType || '') ? 'heroDocumentTextSolid' : 'heroPhotoSolid'" size="24"></ng-icon>
              <span class="font-medium">{{ fileToPreview()?.originalName }}</span>
            </div>
            <div class="flex items-center gap-3">
              <button class="p-2 hover:bg-white/10 rounded-lg transition-colors" (click)="downloadFile(fileToPreview()!)">
                <ng-icon name="heroArrowDownTraySolid" size="20"></ng-icon>
              </button>
              <button class="p-2 hover:bg-white/10 rounded-lg transition-colors" (click)="closePreviewModal(); $event.stopPropagation()">
                <ng-icon name="heroXMarkSolid" size="24"></ng-icon>
              </button>
            </div>
          </div>
          <div class="flex-1 flex items-center justify-center p-4" (click)="$event.stopPropagation()">
            @if (previewUrl()) {
              @if (isImage(fileToPreview()?.mimeType || '')) {
                <img [src]="previewUrl()" [alt]="fileToPreview()?.originalName" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              } @else if (isPdf(fileToPreview()?.mimeType || '')) {
                <iframe [src]="previewUrl()" class="w-full h-full max-w-4xl rounded-lg shadow-2xl bg-white"></iframe>
              }
            } @else {
              <app-loader size="lg" label="Loading preview..."></app-loader>
            }
          </div>
        </div>
      }

      <!-- Folder Create/Rename Modal -->
      @if (showFolderModal()) {
        <!-- Premium Backdrop -->
        <div class="modal-overlay-premium" (click)="closeFolderModal()" aria-hidden="true"></div>

        <!-- Modal Container -->
        <div class="fixed inset-0 flex items-center justify-center p-4" style="z-index: var(--z-modal);" (click)="closeFolderModal()">
          <div class="modal-panel-premium w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="p-6 border-b border-border-color">
              <h3 class="text-lg font-bold text-text-primary">
                {{ folderModalMode() === 'create' ? 'Create New Folder' : 'Rename Folder' }}
              </h3>
            </div>
            <div class="p-6">
              <label class="block text-sm font-medium text-text-secondary mb-2">Folder Name</label>
              <input
                type="text"
                [(ngModel)]="newFolderName"
                class="w-full px-4 py-2 rounded-xl border border-border-color bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                placeholder="Enter folder name"
                (keyup.enter)="confirmFolderAction()"
                autofocus
              />
            </div>
            <div class="p-6 border-t border-border-color flex justify-end gap-3">
              <app-button variant="secondary" size="md" (clicked)="closeFolderModal()">Cancel</app-button>
              <app-button variant="primary" size="md" (clicked)="confirmFolderAction()" [disabled]="!newFolderName.trim()">
                {{ folderModalMode() === 'create' ? 'Create' : 'Rename' }}
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- Folder Delete Confirmation Modal -->
      @if (showFolderDeleteModal()) {
        <!-- Premium Backdrop -->
        <div class="modal-overlay-premium" (click)="closeFolderDeleteModal()" aria-hidden="true"></div>

        <!-- Modal Container -->
        <div class="fixed inset-0 flex items-center justify-center p-4" style="z-index: var(--z-modal);" (click)="closeFolderDeleteModal()">
          <div class="modal-panel-premium w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="p-6 border-b border-border-color">
              <h3 class="text-lg font-bold text-text-primary">Delete Folder</h3>
            </div>
            <div class="p-6">
              <p class="text-text-secondary">
                Are you sure you want to delete <strong class="text-text-primary">{{ folderToDelete()?.name }}</strong>?
                All files and subfolders within it must be deleted first.
              </p>
            </div>
            <div class="p-6 border-t border-border-color flex justify-end gap-3">
              <app-button variant="secondary" size="md" (clicked)="closeFolderDeleteModal()">Cancel</app-button>
              <app-button variant="danger" size="md" (clicked)="confirmFolderDelete()">Delete</app-button>
            </div>
          </div>
        </div>
      }

      <!-- Folder Tree Template -->
      <ng-template #folderTree let-folder="folder" let-level="level">
        <div class="folder-tree-node" [style.paddingLeft.px]="level * 12">
          <button
            class="folder-tree-row group/folder"
            [class.is-active]="currentFolder()?.id === folder.id"
            (click)="navigateToFolder(folder.id)"
          >
            <span class="folder-icon-wrap">
              <ng-icon
                [name]="currentFolder()?.id === folder.id ? 'heroFolderOpenSolid' : 'heroFolderSolid'"
                size="16"
                class="text-amber-500"
              ></ng-icon>
            </span>
            <span class="folder-title truncate">{{ folder.name }}</span>
            @if (folder.fileCount > 0) {
              <span class="folder-count">
                {{ folder.fileCount }}
              </span>
            } @else if (folder.children?.length) {
              <span class="folder-count folder-count-muted">
                {{ folder.children.length }}
              </span>
            }

            <!-- Inline Folder Actions -->
            @if (!['root', 'documents', 'years', 'year'].includes(folder.type)) {
              <div class="folder-row-actions">
                <button 
                  class="folder-row-action" 
                  (click)="triggerFolderRename(folder); $event.stopPropagation()"
                  title="Rename"
                >
                  <ng-icon name="heroPencilSquareSolid" size="12"></ng-icon>
                </button>
                <button 
                  class="folder-row-action folder-row-action-danger" 
                  (click)="triggerFolderDelete(folder); $event.stopPropagation()"
                  title="Delete"
                >
                  <ng-icon name="heroTrashSolid" size="12"></ng-icon>
                </button>
              </div>
            }
          </button>
          @if (folder.children.length) {
            @for (child of folder.children; track child.id) {
              <ng-container *ngTemplateOutlet="folderTree; context: { folder: child, level: level + 1 }"></ng-container>
            }
          }
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .files-module {
      --files-primary: #2563eb;
      --files-ink: #0f172a;
      --files-muted: #64748b;
      --files-border: #d7dce5;
      --files-soft: #f5f6f8;
    }

    .files-panel-label {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--files-primary);
    }

    .files-tree-card,
    .files-browser-card {
      overflow: hidden;
      border: 1px solid var(--files-border);
      border-radius: 0.75rem;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .files-tree-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.8rem 0.9rem;
      border-bottom: 1px solid #e5e7eb;
      background: #f7f8fa;
    }

    .files-tree-header h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.15rem 0 0;
      color: var(--files-ink);
      font-size: 0.9rem;
      font-weight: 800;
    }

    .files-count-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.55rem;
      border-radius: 0.55rem;
      color: #334155;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px #e5e7eb;
      font-weight: 800;
      font-size: 0.78rem;
    }

    .files-tree-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.55rem 0.9rem;
      border-bottom: 1px solid #e5e7eb;
      color: #667085;
      background: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .files-browser-toolbar {
      border-bottom: 1px solid #e5e7eb;
      background: #f7f8fa;
    }

    .explorer-address-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem);
      gap: 0.65rem;
      padding: 0.65rem 0.8rem;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .explorer-address-bar,
    .explorer-search-box {
      display: flex;
      align-items: center;
      min-height: 2.25rem;
      border: 1px solid #d7dce5;
      border-radius: 0.45rem;
      background: #ffffff;
    }

    .explorer-address-bar {
      gap: 0.25rem;
      overflow: hidden;
      padding: 0 0.45rem;
    }

    .address-segment {
      display: inline-flex;
      align-items: center;
      gap: 0.38rem;
      min-width: 0;
      height: 1.75rem;
      padding: 0 0.5rem;
      border-radius: 0.35rem;
      color: #1f2937;
      font-size: 0.8rem;
      font-weight: 650;
      white-space: nowrap;
      transition: background 140ms ease, color 140ms ease;
    }

    .address-segment:hover {
      color: var(--files-primary);
      background: #eef6ff;
    }

    .address-segment.is-current {
      color: #111827;
      background: #f3f4f6;
      cursor: default;
    }

    .address-chevron {
      color: #98a2b3;
      flex: 0 0 auto;
    }

    .explorer-search-box {
      gap: 0.5rem;
      padding: 0 0.7rem;
      color: #98a2b3;
      font-size: 0.78rem;
      font-weight: 650;
    }

    .explorer-search-box mat-icon {
      width: 1.1rem;
      height: 1.1rem;
      font-size: 1.1rem;
    }

    .explorer-info-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e5e7eb;
      background: #fbfbfc;
    }

    .explorer-info-strip h2 {
      margin: 0;
      color: var(--files-ink);
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .explorer-info-strip p,
    .explorer-info-strip span {
      margin: 0.18rem 0 0;
      color: #667085;
      font-size: 0.78rem;
      font-weight: 650;
    }

    .files-upload-progress {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e5e7eb;
      background: #eff6ff;
    }

    .files-content {
      min-height: 26rem;
      background: #ffffff;
    }

    .files-empty-state {
      display: flex;
      min-height: 26rem;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
      color: var(--files-muted);
    }

    .files-empty-icon {
      display: grid;
      place-items: center;
      width: 5.5rem;
      height: 5.5rem;
      margin-bottom: 1rem;
      border-radius: 1.5rem;
      color: var(--files-primary);
      background: #eef2ff;
      box-shadow: inset 0 0 0 1px #dbe3ff;
    }

    .files-empty-icon mat-icon {
      width: 3rem;
      height: 3rem;
      font-size: 3rem;
    }

    .files-empty-state h3 {
      margin: 0;
      color: var(--files-ink);
      font-size: 1.15rem;
      font-weight: 900;
    }

    .files-empty-state p {
      max-width: 24rem;
      margin: 0.5rem 0 1.25rem;
      font-size: 0.86rem;
      line-height: 1.55;
    }

    .files-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.7rem 1rem;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      background: #fbfdff;
      font-size: 0.75rem;
      font-weight: 750;
      user-select: none;
    }

    .files-status-bar button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.8rem;
      height: 1.8rem;
      border-radius: 0.55rem;
      color: #475569;
      transition: background 160ms ease, color 160ms ease;
    }

    .files-status-bar button:hover {
      color: var(--files-primary);
      background: #eef2ff;
    }

    .folder-tree-node {
      margin-bottom: 0.25rem;
    }

    .folder-tree-row {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.55rem;
      min-height: 2.25rem;
      padding: 0.32rem 0.45rem;
      border: 1px solid transparent;
      border-radius: 0.42rem;
      color: #334155;
      background: transparent;
      font-size: 0.81rem;
      font-weight: 600;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    .folder-tree-row:hover {
      color: #111827;
      border-color: #dbeafe;
      background: #eef6ff;
    }

    .folder-tree-row.is-active {
      color: #111827;
      border-color: #7eb7f3;
      background: #cfe8ff;
      box-shadow: none;
    }

    .folder-icon-wrap {
      display: inline-grid;
      place-items: center;
      width: 1.45rem;
      height: 1.45rem;
      border-radius: 0.28rem;
      background: transparent;
      box-shadow: none;
      flex: 0 0 auto;
    }

    .folder-tree-row.is-active .folder-icon-wrap {
      box-shadow: none;
    }

    .folder-title {
      min-width: 0;
      flex: 1;
      text-align: left;
    }

    .folder-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.45rem;
      height: 1.45rem;
      padding: 0 0.38rem;
      border-radius: 0.35rem;
      color: #475569;
      background: #edf2f7;
      font-size: 0.68rem;
      font-weight: 800;
      flex: 0 0 auto;
    }

    .folder-count-muted {
      color: #718198;
      background: #f1f5f9;
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }

    .folder-row-actions {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      margin-left: 0.2rem;
      opacity: 0;
      transition: opacity 150ms ease;
      flex: 0 0 auto;
    }

    .folder-tree-row:hover .folder-row-actions,
    .folder-tree-row:focus-visible .folder-row-actions {
      opacity: 1;
    }

    .folder-row-action {
      display: inline-grid;
      place-items: center;
      width: 1.45rem;
      height: 1.45rem;
      border-radius: 0.35rem;
      color: #64748b;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px #e2e8f0;
      transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease;
    }

    .folder-row-action:hover {
      color: var(--files-primary);
      background: #eef2ff;
      box-shadow: inset 0 0 0 1px #c7d2fe;
    }

    .folder-row-action-danger:hover {
      color: #dc2626;
      background: #fff1f2;
      box-shadow: inset 0 0 0 1px #fecdd3;
    }

    .no-scrollbar {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }

    @media (max-width: 768px) {
      .explorer-address-row {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientWorkspaceComponent implements OnInit, OnDestroy {
  // Remove duplicate ngOnInit

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workspaceService = inject(WorkspaceService);
  private workspaceContext = inject(ClientWorkspaceContextService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  public viewService = inject(ViewPreferenceService);
  private destroy$ = new Subject<void>();
  private loadedClientId: string | null = null;
  private activeWorkspaceRequest = 0;

  // View state
  viewState$ = this.viewService.state$;
  selectedFile = signal<FileItem | null>(null);

  // File items computed from current folder
  fileItems = computed<FileItem[]>(() => {
    const current = this.currentFolder();
    if (!current) return [];

    const folders: FileItem[] = (current.children || []).map(f => ({
      id: f.id,
      name: f.name,
      type: 'folder',
      modifiedDate: new Date(),
      createdDate: new Date(),
      owner: 'System',
      path: f.slug || ''
    }));

    const files: FileItem[] = (current.files || []).map(f => ({
      id: f.id,
      name: f.originalName,
      type: this.getFileType(f.mimeType),
      size: f.size,
      modifiedDate: new Date(f.createdAt),
      createdDate: new Date(f.createdAt),
      owner: f.uploadedBy?.name || 'System',
      path: f.s3Path || '',
      thumbnailUrl: this.thumbnails()[f.id]
    }));

    return [...folders, ...files];
  });

  private getFileType(mime: string): 'pdf' | 'image' | 'text' | 'unknown' {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('image')) return 'image';
    if (mime.includes('text') || mime.includes('plain')) return 'text';
    return 'unknown';
  }

  onFileSelected(file: FileItem) {
    this.selectedFile.set(file);
  }

  onFileOpened(file: FileItem) {
    if (file.type === 'folder') {
      this.navigateToFolder(file.id);
    } else {
      // Find the FileNode to use existing preview logic
      const fileNode = this.currentFolder()?.files.find(f => f.id === file.id);
      if (fileNode) {
        this.previewFile(fileNode);
      }
    }
  }

  onFileRenamed(event: { file: FileItem, newName: string }) {
    console.log('Workspace: onFileRenamed called for', event.file.name, 'new name:', event.newName);
    const fileNode = this.currentFolder()?.files.find(f => f.id === event.file.id);
    if (fileNode && event.newName) {
      // Directly call rename API with new name
      this.workspaceService.renameFile(fileNode.id, event.newName)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toast.success('File renamed successfully');
            // Refresh current folder
            this.navigateToFolder(this.currentFolder()!.id);
          },
          error: (error) => {
            this.toast.error('Rename failed', error.message);
          }
        });
    }
  }

  onFilePreviewed(file: FileItem) {
    console.log('Workspace: onFilePreviewed called for', file.name);
    if (file.type === 'folder') return;

    const fileNode = this.currentFolder()?.files.find(f => f.id === file.id);
    if (fileNode) {
      this.previewFile(fileNode);
    }
  }

  onFileDownloaded(file: FileItem) {
    console.log('Workspace: onFileDownloaded called for', file.name);
    const fileNode = this.currentFolder()?.files.find(f => f.id === file.id);
    if (fileNode) {
      this.downloadFile(fileNode);
    }
  }

  onFileDeleted(file: FileItem) {
    console.log('Workspace: onFileDeleted called for', file.name);
    const fileNode = this.currentFolder()?.files.find(f => f.id === file.id);
    if (fileNode) {
      this.deleteFile(fileNode);
    }
  }

  onFolderNavigationRequested(folderId: string) {
    this.setActiveTab('files');
    this.navigateToFolder(folderId);
  }

  onTabChangeRequested(tab: any) {
    this.setActiveTab(tab as WorkspaceTab);
  }

  // State
  workspace = signal<WorkspaceTree | null>(null);
  currentFolder = signal<FolderNode | null>(null);
  breadcrumbs = signal<Breadcrumb[]>([]);
  isLoading = signal(true);
  workspaceLoadError = signal<string | null>(null);
  uploadProgress = signal(0);
  thumbnails = signal<Record<string, SafeResourceUrl>>({}); // Store thumbnails using SafeResourceUrl

  // File Action States
  showRenameModal = signal(false);
  showDeleteModal = signal(false);
  showPreviewModal = signal(false);
  fileToRename = signal<FileNode | null>(null);
  fileToDelete = signal<FileNode | null>(null);
  fileToPreview = signal<FileNode | null>(null);
  newFileName = '';
  previewUrl = signal<SafeResourceUrl | null>(null);

  // ... (rest of state)


  // Folder modal states
  showFolderModal = signal(false);
  showFolderDeleteModal = signal(false);
  folderModalMode = signal<'create' | 'rename'>('create');
  folderToRename = signal<FolderNode | null>(null);
  folderToDelete = signal<FolderNode | null>(null);
  newFolderName = '';

  // Tab state
  activeTab = signal<WorkspaceTab>('files');
  
  // Active tab metadata for header
  activeTabData = computed(() => {
    const tab = this.activeTab();
    return this.workspaceContext.workspaceTabs.find(t => t.tab === (tab as any)) || { 
      label: 'Files', 
      iconName: 'heroFolderOpenSolid' 
    };
  });

  private readonly workspaceTabs: readonly WorkspaceTab[] = [
    'files',
    'checklists',
    'deadlines',
    'data',
    'gst',
    'billing',
    'accounting',
    'banking',
    'payroll',
    'vendors',
    'dashboard',
    'inventory',
  ];

  // Modal states aggregation for overflow control
  private isAnyModalOpen = computed(() =>
    this.showRenameModal() ||
    this.showDeleteModal() ||
    this.showPreviewModal() ||
    this.showFolderModal() ||
    this.showFolderDeleteModal()
  );

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') {
        if (this.isAnyModalOpen()) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }
    });
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const clientId = params.get('clientId');
        if (clientId) {
          this.loadWorkspace(clientId);
        }
      });

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.setActiveTab(this.parseTab(params.get('tab')), false);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkspace(clientId: string, force = false) {
    const normalizedClientId = clientId.trim();
    if (!normalizedClientId) {
      this.workspace.set(null);
      this.currentFolder.set(null);
      this.loadedClientId = null;
      this.workspaceLoadError.set('Missing client workspace id.');
      this.isLoading.set(false);
      return;
    }

    if (!force && this.loadedClientId === normalizedClientId && this.workspace()) {
      return;
    }

    const requestId = ++this.activeWorkspaceRequest;
    this.workspaceLoadError.set(null);
    if (!this.workspace() || this.loadedClientId !== normalizedClientId) {
      this.isLoading.set(true);
    }

    this.workspaceService.getClientWorkspace(normalizedClientId)
      .pipe(
        timeout({ first: 15000 }),
        takeUntil(this.destroy$),
        finalize(() => {
          if (requestId === this.activeWorkspaceRequest) {
            this.isLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (response) => {
          if (requestId !== this.activeWorkspaceRequest) {
            return;
          }

          this.workspaceContext.rememberClient(normalizedClientId);
          this.loadedClientId = normalizedClientId;
          this.workspace.set(response.data);
          this.currentFolder.set(response.data.rootFolder);
          this.breadcrumbs.set([]);
          if (response.data.rootFolder.files) {
            this.loadThumbnails(response.data.rootFolder.files);
          }
        },
        error: (error) => {
          if (requestId !== this.activeWorkspaceRequest) {
            return;
          }

          const message = this.workspaceErrorMessage(error);
          this.workspaceLoadError.set(message);

          if (error?.status === 401) {
            this.workspace.set(null);
            this.currentFolder.set(null);
            this.loadedClientId = null;
            return;
          }

          if (!this.workspace() || this.loadedClientId !== normalizedClientId) {
            const fallbackWorkspace = this.createFallbackWorkspace(normalizedClientId);
            this.workspaceContext.rememberClient(normalizedClientId);
            this.loadedClientId = normalizedClientId;
            this.workspace.set(fallbackWorkspace);
            this.currentFolder.set(fallbackWorkspace.rootFolder);
            this.breadcrumbs.set([]);
          }

          this.toast.warning('Workspace folders unavailable', message);
        }
      });
  }

  private workspaceErrorMessage(error: any): string {
    if (error?.name === 'TimeoutError') {
      return 'Workspace folders took too long to load. Modules are available while files retry.';
    }

    return error?.userMessage || error?.message || 'Workspace folders could not be loaded.';
  }

  private createFallbackWorkspace(clientId: string): WorkspaceTree {
    const clientCode = clientId.slice(0, 8).toUpperCase();
    const folderName = `${clientCode} Workspace`;

    return {
      clientId,
      clientCode,
      clientName: 'Client workspace',
      rootFolder: {
        id: `fallback-root-${clientId}`,
        name: folderName,
        slug: `${clientCode.toLowerCase()}-workspace`,
        type: 'root',
        s3Prefix: `/${clientCode}`,
        fileCount: 0,
        folderCount: 0,
        totalSize: 0,
        children: [],
        files: [],
      },
    };
  }

  setActiveTab(tab: WorkspaceTab, syncUrl: boolean = true) {
    this.activeTab.set(tab);

    if (!syncUrl) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'files' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  private parseTab(tab: string | null): WorkspaceTab {
    if (tab && this.workspaceTabs.includes(tab as WorkspaceTab)) {
      return tab as WorkspaceTab;
    }

    return 'files';
  }

  refresh() {
    const clientId = this.route.snapshot.paramMap.get('clientId');
    if (clientId) {
      this.loadWorkspace(clientId, true);
    }
  }

  navigateToRoot() {
    if (this.workspace()) {
      const root = this.workspace()!.rootFolder;
      this.currentFolder.set(root);
      this.breadcrumbs.set([]);
      if (root.files) {
        this.loadThumbnails(root.files);
      }
    }
  }

  navigateToFolder(folderId: string) {
    // If it's the root folder, use the cached workspace data to avoid API call
    if (this.workspace()?.rootFolder.id === folderId) {
      this.navigateToRoot();
      return;
    }

    // Immediate UI update if folder is found in existing tree
    if (this.workspace()) {
      const folderInTree = this.findFolderInTree(this.workspace()!.rootFolder, folderId);
      if (folderInTree) {
        this.currentFolder.set(folderInTree);
        if (folderInTree.files) {
          this.loadThumbnails(folderInTree.files);
        }
      }
    }

    this.workspaceService.getFolderContents(folderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const folder = response.data.folder;
          const current = this.currentFolder();

          // Sticky subfolders: If API returns empty list but we already have subfolders in local state, preserve them
          if (current && current.id === folder.id && (!folder.children || folder.children.length === 0) && current.children?.length > 0) {
            folder.children = current.children;
            folder.folderCount = current.children.length;
          }

          this.currentFolder.set(folder);
          this.breadcrumbs.set(response.data.breadcrumbs.slice(1)); // Remove root from breadcrumbs

          if (folder.files) {
            this.loadThumbnails(folder.files);
          }
        },
        error: (error) => {
          this.toast.error('Failed to load folder', error.message);
        }
      });
  }

  goBack() {
    const crumbs = this.breadcrumbs();
    if (crumbs.length > 0) {
      if (crumbs.length === 1) {
        this.navigateToRoot();
      } else {
        const parentFolderId = crumbs[crumbs.length - 2].id;
        this.navigateToFolder(parentFolderId);
      }
    }
  }

  triggerUpload() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length || !this.currentFolder()) return;

    const folderId = this.currentFolder()!.id;

    Array.from(files).forEach(file => {
      this.uploadProgress.set(0);
      this.workspaceService.uploadFile(folderId, file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
            } else if (event.type === HttpEventType.Response) {
              this.uploadProgress.set(100);
              this.toast.success('File uploaded successfully');
              this.navigateToFolder(folderId);
              setTimeout(() => this.uploadProgress.set(0), 1000);
            }
          },
          error: (error) => {
            this.uploadProgress.set(0);
            this.toast.error('Upload failed', error.error?.message || error.message);
          }
        });
    });

    input.value = '';
  }

  downloadFile(file: FileNode) {
    this.workspaceService.getFileDownloadUrl(file.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.workspaceService.downloadFile(response.data.url, response.data.fileName);
        },
        error: (error) => {
          this.toast.error('Download failed', error.message);
        }
      });
  }

  renameFile(file: FileNode) {
    this.fileToRename.set(file);
    this.newFileName = file.originalName;
    this.showRenameModal.set(true);
  }

  closeRenameModal() {
    this.showRenameModal.set(false);
    this.fileToRename.set(null);
    this.newFileName = '';
  }

  confirmRename() {
    const file = this.fileToRename();
    if (!file || !this.newFileName.trim()) return;

    this.workspaceService.renameFile(file.id, this.newFileName.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('File renamed successfully');
          this.closeRenameModal();
          if (this.currentFolder()) {
            this.navigateToFolder(this.currentFolder()!.id);
          }
        },
        error: (error) => {
          this.toast.error('Rename failed', error.error?.message || error.message);
        }
      });
  }

  deleteFile(file: FileNode) {
    this.fileToDelete.set(file);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.fileToDelete.set(null);
  }

  confirmDelete() {
    const file = this.fileToDelete();
    if (!file) return;

    this.workspaceService.deleteFile(file.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('File deleted successfully');
          this.closeDeleteModal();
          if (this.currentFolder()) {
            this.navigateToFolder(this.currentFolder()!.id);
          }
        },
        error: (error) => {
          this.toast.error('Delete failed', error.error?.message || error.message);
        }
      });
  }

  previewFile(file: FileNode) {
    this.fileToPreview.set(file);
    this.previewUrl.set(null);
    this.showPreviewModal.set(true);

    this.workspaceService.getFileDownloadUrl(file.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Sanitize the URL to allow it to be used in an iframe
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.data.url);
          this.previewUrl.set(safeUrl);
        },
        error: (error) => {
          this.toast.error('Failed to load preview', error.message);
          this.closePreviewModal();
        }
      });
  }

  closePreviewModal() {
    this.showPreviewModal.set(false);
    this.fileToPreview.set(null);
    this.previewUrl.set(null);
  }

  formatFileSize(bytes: number): string {
    return this.workspaceService.formatFileSize(bytes);
  }

  formatTotalSize(bytes: number): string {
    return this.workspaceService.formatFileSize(bytes);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Folder CRUD
  triggerFolderCreate() {
    this.folderModalMode.set('create');
    this.newFolderName = '';
    this.showFolderModal.set(true);
  }

  triggerFolderRename(folder: FolderNode) {
    this.folderModalMode.set('rename');
    this.folderToRename.set(folder);
    this.newFolderName = folder.name;
    this.showFolderModal.set(true);
  }

  triggerFolderDelete(folder: FolderNode) {
    this.folderToDelete.set(folder);
    this.showFolderDeleteModal.set(true);
  }

  closeFolderModal() {
    this.showFolderModal.set(false);
    this.folderToRename.set(null);
    this.newFolderName = '';
  }

  closeFolderDeleteModal() {
    this.showFolderDeleteModal.set(false);
    this.folderToDelete.set(null);
  }

  confirmFolderAction() {
    if (!this.newFolderName.trim()) return;

    if (this.folderModalMode() === 'create') {
      const parentId = this.currentFolder()?.id;
      if (!parentId) return;

      this.workspaceService.createFolder(parentId, this.newFolderName.trim())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toast.success('Folder created successfully');
            this.closeFolderModal();
            this.refresh();
          },
          error: (error) => {
            this.toast.error('Failed to create folder', error.error?.message || error.message);
          }
        });
    } else {
      const folder = this.folderToRename();
      if (!folder) return;

      this.workspaceService.renameFolder(folder.id, this.newFolderName.trim())
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toast.success('Folder renamed successfully');
            this.closeFolderModal();
            this.refresh();
          },
          error: (error) => {
            this.toast.error('Failed to rename folder', error.error?.message || error.message);
          }
        });
    }

  }

  loadThumbnails(files: FileNode[]) {
    files
      .filter(file => this.isImage(file.mimeType) && !this.thumbnails()[file.id])
      .slice(0, 12)
      .forEach(file => {
      // Only load thumbnails for images that don't have one yet
        this.workspaceService.getFileDownloadUrl(file.id, true) // Pass true for preview mode (skip log)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.data.url);
              this.thumbnails.update(prev => ({ ...prev, [file.id]: safeUrl }));
            },
            error: () => {
              // Silently fail for thumbnails
            }
          });
    });
  }

  confirmFolderDelete() {
    const folder = this.folderToDelete();
    if (!folder) return;

    this.workspaceService.deleteFolder(folder.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Folder deleted successfully');
          this.closeFolderDeleteModal();
          this.refresh();
        },
        error: (error) => {
          this.toast.error('Failed to delete folder', error.error?.message || error.message);
        }
      });
  }

  isImage(mimeType: string): boolean {
    return mimeType?.includes('image') || false;
  }

  isPdf(mimeType: string): boolean {
    return mimeType?.includes('pdf') || false;
  }

  private findFolderInTree(node: FolderNode, id: string): FolderNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = this.findFolderInTree(child, id);
      if (found) return found;
    }
    return null;
  }
}
