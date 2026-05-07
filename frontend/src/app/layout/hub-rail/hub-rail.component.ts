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
        style="--hub-accent: #C9943A"
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
            [style.--hub-accent]="hub.color"
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
      flex: 0 0 58px;
    }

    .hub-rail {
      align-items: center;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      justify-content: space-between;
      overflow-y: auto;
      padding: 12px 0;
      scrollbar-width: none;
      width: 58px;
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
      margin-top: 22px;
      width: 100%;
    }

    .rail-button {
      --hub-accent: #64748b;
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 12px;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      justify-content: center;
      position: relative;
      transition:
        background 180ms ease,
        border-color 180ms ease,
        color 180ms ease;
      width: 42px;
      height: 42px;
    }

    .rail-button:hover {
      background: #f8fafc;
      border-color: color-mix(in srgb, var(--hub-accent) 26%, #e2e8f0);
      color: var(--hub-accent);
    }

    .rail-button.active {
      background: color-mix(in srgb, var(--hub-accent) 12%, #ffffff);
      border-color: color-mix(in srgb, var(--hub-accent) 22%, #ffffff);
      color: var(--hub-accent);
    }

    .rail-button.active::before {
      background: var(--hub-accent);
      border-radius: 999px;
      content: '';
      height: 24px;
      left: -10px;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
    }

    .rail-logo {
      color: #64748b;
    }

    .rail-search {
      margin-top: 16px;
    }

    .rail-badge {
      align-items: center;
      background: #ef4444;
      border: 2px solid var(--color-surface);
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
