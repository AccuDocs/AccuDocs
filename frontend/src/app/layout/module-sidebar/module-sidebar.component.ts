import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NavigationService } from '../../core/navigation.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ClientWorkspaceContextService,
  ClientWorkspaceShortcutTab,
} from '../../core/services/client-workspace-context.service';
import {
  AppModule,
  getHubModules,
  groupModulesByStatus,
} from '../../core/module-registry';
import { NavRowButtonComponent } from '@ui/molecules/nav-row-button.component';
import { IconComponent } from '@ui/atoms/icon.component';

@Component({
  selector: 'app-module-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NavRowButtonComponent, IconComponent],
  template: `
    <aside
      class="module-sidebar flex flex-col"
      style="
        width: 220px;
        height: 100vh;
        overflow-y: auto;
        overflow-x: hidden;
        background: var(--color-surface);
        border-right: 1px solid var(--color-border);
      "
    >
      <!-- Hub Header -->
      <div
        class="hub-header p-4 border-b"
        style="
          border-color: var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        "
      >
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          @if (hubData(); as hub) {
            <div
              style="
                align-items: center;
                background: var(--color-bg-raised);
                border: 1px solid var(--color-border);
                border-radius: 10px;
                color: var(--color-text);
                display: flex;
                height: 32px;
                justify-content: center;
                width: 32px;
              "
            >
              <app-icon [name]="hub.iconName" size="sm" tone="current" ariaLabel=""></app-icon>
            </div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: var(--color-text);">
                {{ hub.label }}
              </div>
              <div
                style="
                  font-size: 12px;
                  color: var(--color-text-sub);
                  line-height: 1;
                  margin-top: 2px;
                "
              >
                {{ hub.desc }}
              </div>
            </div>
          }
        </div>
        <button
          (click)="nav.toggleSidebar()"
          style="
            background: transparent;
            border: none;
            color: var(--color-text-sub);
            cursor: pointer;
            font-size: 16px;
            padding: 4px 8px;
            border-radius: 9px;
            transition: all 0.2s;
          "
          class="hover:bg-gray-700"
        >
          ‹
        </button>
      </div>

      <!-- Modules grouped by status -->
      <div class="flex-1 overflow-y-auto" style="padding: 12px 0;">
        <!-- LIVE Section -->
        @if (grouped().live.length > 0) {
          <div>
            <div
              class="px-4 py-2 text-xs uppercase tracking-wider"
              style="
                color: var(--color-text-dim);
                display: flex;
                align-items: center;
                gap: 6px;
              "
            >
              <span style="width: 6px; height: 6px; border-radius: 9px; background: #3D9E6A;"></span>
              Ready
            </div>
            @for (module of grouped().live; track module.id) {
              <app-nav-row-button
                [iconName]="module.iconName || ''"
                [glyph]="module.iconName ? '' : module.icon"
                [label]="module.label"
                [badge]="module.badge || null"
                [active]="nav.activeModule() === module.id"
                [accentColor]="getHubColor()"
                [ariaLabel]="module.label"
                (clicked)="nav.navigateTo(module.id)"
              />
              @if (showModuleShortcuts(module)) {
                <div
                  style="
                    padding: 6px 0 12px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                  "
                >
                  @for (shortcut of getVisibleModuleShortcuts(module); track shortcut.route) {
                    <app-nav-row-button
                      [iconName]="shortcut.iconName || ''"
                      [label]="shortcut.label"
                      [active]="isModuleShortcutActive(module, shortcut.route)"
                      [accentColor]="getHubColor()"
                      [paddingLeft]="28"
                      [muted]="true"
                      [ariaLabel]="shortcut.label"
                      (clicked)="openModuleShortcut(shortcut.route)"
                    />
                  }
                </div>
              }
              @if (showClientWorkspaceShortcuts(module.id)) {
                <div
                  style="
                    padding: 6px 0 12px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                  "
                >
                  @for (shortcut of clientWorkspaceTabs; track shortcut.tab) {
                    <app-nav-row-button
                      [iconName]="shortcut.iconName"
                      [label]="shortcut.label"
                      [active]="isClientWorkspaceTabActive(shortcut.tab)"
                      [accentColor]="getHubColor()"
                      [paddingLeft]="28"
                      [muted]="true"
                      [ariaLabel]="shortcut.label"
                      (clicked)="openClientWorkspaceTab(shortcut.tab)"
                    />
                  }
                </div>
              }
            }
          </div>
        }

        <!-- BETA Section -->
        @if (grouped().beta.length > 0) {
          <div>
            <div
              class="px-4 py-2 text-xs uppercase tracking-wider"
              style="
                color: var(--color-text-dim);
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
              "
            >
              <span style="width: 6px; height: 6px; border-radius: 9px; background: #C87C2A;"></span>
              Beta
            </div>
            @for (module of grouped().beta; track module.id) {
              <app-nav-row-button
                [iconName]="module.iconName || ''"
                [glyph]="module.iconName ? '' : module.icon"
                [label]="module.label"
                [badge]="module.badge || null"
                [active]="nav.activeModule() === module.id"
                [accentColor]="getHubColor()"
                [muted]="true"
                [ariaLabel]="module.label"
                (clicked)="nav.navigateTo(module.id)"
              />
            }
          </div>
        }

        <!-- SOON Section -->
        @if (grouped().soon.length > 0) {
          <div>
            <div
              class="px-4 py-2 text-xs uppercase tracking-wider"
              style="
                color: var(--color-text-dim);
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 8px;
              "
            >
              <span style="width: 6px; height: 6px; border-radius: 9px; background: #7A8898;"></span>
              Coming Soon
            </div>
            @for (module of grouped().soon; track module.id) {
              <button
                (click)="nav.navigateTo(module.id)"
                style="
                  width: 100%;
                  padding: 10px 16px;
                  text-align: left;
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  color: var(--color-text);
                  font-size: 14px;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  transition: all 0.2s;
                  border-left: 3px solid transparent;
                  opacity: 0.5;
                  cursor: not-allowed;
                "
              >
                @if (module.iconName) {
                  <app-icon [name]="module.iconName" size="sm" tone="current" ariaLabel=""></app-icon>
                } @else {
                  <span>{{ module.icon }}</span>
                }
                <span class="flex-1">{{ module.label }}</span>
              </button>
            }
          </div>
        }
      </div>

      <!-- Bottom user section -->
      <div
        class="border-t p-4"
        style="
          border-color: var(--color-border);
          display: flex;
          align-items: center;
          gap: 8px;
        "
      >
        <div
          style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--color-gold);
            color: var(--color-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 12px;
          "
        >
          {{ authService.currentUser()?.name?.charAt(0) || 'CA' }}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 13px; color: var(--color-text);" class="truncate">
            {{ authService.currentUser()?.name || 'Firm Name' }}
          </div>
          <div
            style="
              font-size: 11px;
              color: var(--color-text-sub);
              display: flex;
              align-items: center;
              gap: 4px;
              margin-top: 2px;
              text-transform: capitalize;
            "
          >
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #3D9E6A;"></span>
            {{ authService.currentUser()?.role || 'Admin' }}
          </div>
        </div>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleSidebarComponent {
  nav = inject(NavigationService);
  authService = inject(AuthService);
  private router = inject(Router);
  private workspaceContext = inject(ClientWorkspaceContextService);

  hubData = this.nav.activeHubData;
  clientWorkspaceTabs = this.workspaceContext.workspaceTabs;
  hasActiveClientSelection = this.workspaceContext.hasActiveClientSelection;
  selectedWorkspaceTab = this.workspaceContext.selectedWorkspaceTab;
  currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  grouped = computed(() => {
    const modules = getHubModules(this.nav.activeHub());
    return groupModulesByStatus(modules);
  });

  getHubColor(): string {
    return this.nav.activeHubData()?.color || '#C9943A';
  }

  showClientWorkspaceShortcuts(moduleId: string): boolean {
    return this.nav.activeHub() === 'clients'
      && moduleId === 'clients_user_client'
      && this.hasActiveClientSelection();
  }

  showModuleShortcuts(module: AppModule): boolean {
    return this.getVisibleModuleShortcuts(module).length > 0;
  }

  openClientWorkspaceTab(tab: ClientWorkspaceShortcutTab): void {
    this.workspaceContext.openWorkspaceTab(tab);
  }

  isClientWorkspaceTabActive(tab: ClientWorkspaceShortcutTab): boolean {
    return this.selectedWorkspaceTab() === tab;
  }

  openModuleShortcut(route: string): void {
    void this.router.navigateByUrl(route);
  }

  isModuleShortcutActive(module: AppModule, route: string): boolean {
    const activeRoute = this.getActiveModuleShortcutRoute(module);
    return activeRoute === route;
  }

  getVisibleModuleShortcuts(module: AppModule) {
    return (module.shortcuts ?? []).filter((shortcut) => shortcut.route !== module.route);
  }

  private getActiveModuleShortcutRoute(module: AppModule): string | null {
    const url = this.currentUrl();
    const shortcuts = this.getVisibleModuleShortcuts(module);

    let activeRoute: string | null = null;
    let longestMatch = -1;

    for (const shortcut of shortcuts) {
      if (url === shortcut.route || url.startsWith(`${shortcut.route}/`)) {
        if (shortcut.route.length > longestMatch) {
          activeRoute = shortcut.route;
          longestMatch = shortcut.route.length;
        }
        continue;
      }

      if (url.startsWith(`${shortcut.route}?`) && shortcut.route.length > longestMatch) {
        activeRoute = shortcut.route;
        longestMatch = shortcut.route.length;
      }
    }

    return activeRoute;
  }
}
