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
        class="brand-home"
        [class.active]="nav.activeHub() === 'core'"
        title="Home"
        aria-label="Home"
        (click)="nav.setActiveHub('core')"
      >
        <span class="brand-mark">
          <app-icon name="heroShieldCheckSolid" size="md" tone="current" ariaLabel=""></app-icon>
        </span>
        <span class="brand-name">AccuDocs</span>
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
      padding: 12px 0;
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
      margin-top: 14px;
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

    .brand-home {
      align-items: center;
      background: transparent;
      border: 0;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 0;
      width: 100%;
    }

    .brand-mark {
      align-items: center;
      background: #2554dd;
      border-radius: 11px;
      box-shadow: 0 10px 22px rgba(37, 84, 221, 0.26);
      color: #ffffff;
      display: inline-flex;
      height: 42px;
      justify-content: center;
      transition:
        background 180ms ease,
        box-shadow 180ms ease,
        transform 180ms ease;
      width: 42px;
    }

    .brand-name {
      color: rgba(255, 255, 255, 0.78);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1;
      max-width: 56px;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .brand-home:hover .brand-mark,
    .brand-home.active .brand-mark {
      background: #2b5beb;
      box-shadow: 0 12px 26px rgba(37, 84, 221, 0.34);
      transform: translateY(-1px);
    }

    .brand-home:hover .brand-name,
    .brand-home.active .brand-name {
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
