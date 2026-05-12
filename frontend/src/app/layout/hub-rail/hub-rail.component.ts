import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../core/navigation.service';
import { HUBS, getHubBadgeCount } from '../../core/module-registry';
import { IconComponent } from '@ui/atoms/icon.component';

@Component({
  selector: 'app-hub-rail',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <nav class="hub-rail" aria-label="Primary modules">
      <button
        type="button"
        class="rail-button rail-logo"
        [class.active]="nav.activeHub() === 'core'"
        style="--hub-accent: var(--icon-active)"
        title="Home"
        aria-label="Home"
        (click)="nav.setActiveHub('core')"
      >
        <app-icon name="heroBuildingLibrarySolid" size="md" tone="current" ariaLabel=""></app-icon>
      </button>

      <div class="rail-list">
        @for (hub of hubs; track hub.id) {
          <button
            type="button"
            class="rail-button"
            [class.active]="nav.activeHub() === hub.id"
            style="--hub-accent: var(--icon-active)"
            [attr.title]="hub.label"
            [attr.aria-label]="hub.label"
            (click)="nav.setActiveHub(hub.id)"
          >
            <app-icon [name]="hub.iconName" size="md" tone="current" ariaLabel=""></app-icon>

            @if (getHubBadgeCount(hub.id) > 0) {
              <span class="rail-badge">
                {{ getHubBadgeCount(hub.id) > 99 ? '99+' : getHubBadgeCount(hub.id) }}
              </span>
            }
          </button>
        }
      </div>

      <button
        type="button"
        class="rail-button rail-search"
        title="Search modules"
        aria-label="Search modules"
        (click)="nav.openCommandPalette()"
      >
        <app-icon name="heroMagnifyingGlassSolid" size="md" tone="current" ariaLabel=""></app-icon>
      </button>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      flex: 0 0 60px;
    }

    .hub-rail {
      align-items: center;
      background: var(--sidebar-bg);
      display: flex;
      flex-direction: column;
      height: 100vh;
      justify-content: space-between;
      overflow-y: auto;
      padding: 14px 0 12px;
      scrollbar-width: none;
      width: 60px;
    }

    .hub-rail::-webkit-scrollbar {
      display: none;
    }

    .rail-list {
      align-items: center;
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 8px;
      margin-top: 18px;
      width: 100%;
    }

    .rail-button {
      --hub-accent: #64748b;
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.38);
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      position: relative;
      transition:
        background 180ms ease,
        border-color 180ms ease,
        color 180ms ease;
      width: 36px;
      height: 36px;
    }

    .rail-button:hover {
      background: var(--sidebar-hover);
      border-color: transparent;
      color: rgba(255, 255, 255, 0.70);
    }

    .rail-button.active {
      background: var(--sidebar-active);
      border-color: transparent;
      color: var(--icon-active);
    }

    .rail-button.active::before {
      background: var(--icon-active);
      border-radius: 999px;
      content: '';
      height: 5px;
      left: auto;
      right: -7px;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 5px;
    }

    .rail-logo {
      background: linear-gradient(135deg, #1D4ED8, #60A5FA);
      border-color: transparent;
      color: #ffffff;
      height: 32px;
      width: 32px;
    }

    .rail-logo:hover,
    .rail-logo.active {
      background: linear-gradient(135deg, #1D4ED8, #60A5FA);
      color: #ffffff;
    }

    .rail-search {
      margin-top: 16px;
    }

    .rail-badge {
      align-items: center;
      background: var(--danger);
      border: 2px solid var(--sidebar-bg);
      border-radius: 999px;
      color: #ffffff;
      display: inline-flex;
      font-size: 10px;
      font-weight: 900;
      height: 20px;
      justify-content: center;
      min-width: 20px;
      padding: 0 4px;
      position: absolute;
      right: -7px;
      top: -7px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HubRailComponent {
  nav = inject(NavigationService);
  hubs = HUBS;
  getHubBadgeCount = getHubBadgeCount;
}
