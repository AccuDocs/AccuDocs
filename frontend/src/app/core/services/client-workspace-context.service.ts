import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ToastService } from './toast.service';

export type ClientWorkspaceShortcutTab =
  | 'files'
  | 'checklists'
  | 'deadlines'
  | 'data'
  | 'gst'
  | 'dashboard';

@Injectable({
  providedIn: 'root',
})
export class ClientWorkspaceContextService {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly storageKey = 'accudocs_last_workspace_client_id';
  private readonly lastClientId = signal<string | null>(this.readStoredClientId());
  private readonly activeClientId = signal<string | null>(null);
  private readonly activeWorkspaceTab = signal<ClientWorkspaceShortcutTab | null>(null);

  readonly hasActiveClientSelection = computed(() => this.activeClientId() !== null);
  readonly selectedWorkspaceTab = computed(() => this.activeWorkspaceTab());

  readonly workspaceTabs: ReadonlyArray<{
    icon: string;
    label: string;
    tab: ClientWorkspaceShortcutTab;
  }> = [
    { icon: '📁', label: 'Files', tab: 'files' },
    { icon: '📋', label: 'Checklists', tab: 'checklists' },
    { icon: '📅', label: 'Deadlines', tab: 'deadlines' },
    { icon: '📊', label: 'Data', tab: 'data' },
    { icon: '🧾', label: 'GST Filing', tab: 'gst' },
    { icon: '📈', label: 'Dashboard', tab: 'dashboard' },
  ];

  constructor() {
    this.syncFromUrl(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncFromUrl((event as NavigationEnd).urlAfterRedirects);
      });
  }

  rememberClient(clientId: string): void {
    this.activeClientId.set(clientId);
    this.lastClientId.set(clientId);
    this.persistClientId(clientId);
  }

  openWorkspaceTab(tab: ClientWorkspaceShortcutTab = 'files'): void {
    const clientId = this.activeClientId() ?? this.lastClientId();

    if (!clientId) {
      this.toast.info(
        'Open a client workspace first',
        'Pick any client once, then these shortcuts will jump to its workspace tabs.'
      );
      this.router.navigate(['/clients/client']);
      return;
    }

    this.router.navigate(['/workspace', clientId], {
      queryParams: tab === 'files' ? {} : { tab },
    });
  }

  private readStoredClientId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  private persistClientId(clientId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, clientId);
    } catch {
      // Ignore storage errors and keep the in-memory fallback.
    }
  }

  private syncFromUrl(url: string): void {
    const activeClientId = this.extractClientId(url);
    const activeWorkspaceTab = this.extractWorkspaceTab(url);

    this.activeClientId.set(activeClientId);
    this.activeWorkspaceTab.set(activeWorkspaceTab);

    if (activeClientId) {
      this.lastClientId.set(activeClientId);
      this.persistClientId(activeClientId);
    }
  }

  private extractClientId(url: string): string | null {
    const workspaceMatch = url.match(/^\/workspace\/([^/?]+)/);
    if (workspaceMatch) {
      return workspaceMatch[1];
    }

    const clientRouteMatch = url.match(/^\/clients\/client\/([^/?]+)/);
    if (clientRouteMatch && clientRouteMatch[1] !== 'create') {
      return clientRouteMatch[1];
    }

    return null;
  }

  private extractWorkspaceTab(url: string): ClientWorkspaceShortcutTab | null {
    if (!url.startsWith('/workspace/')) {
      return null;
    }

    const [, queryString = ''] = url.split('?');
    const params = new URLSearchParams(queryString);
    const tab = params.get('tab');

    switch (tab) {
      case 'checklists':
      case 'deadlines':
      case 'data':
      case 'gst':
      case 'dashboard':
        return tab;
      case 'files':
      case null:
        return 'files';
      default:
        return 'files';
    }
  }
}
