import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationService } from '../../core/navigation.service';
import { IconButtonComponent } from '@ui/atoms/icon-button.component';

@Component({
  selector: 'app-sidebar-collapsed-strip',
  standalone: true,
  imports: [CommonModule, IconButtonComponent],
  template: `
    <div
      class="sidebar-collapsed w-6 h-screen flex-shrink-0 flex items-center justify-center"
      style="
        width: 24px;
        height: 100vh;
        background: var(--sb2-bg);
        border-right: 1px solid var(--card-border);
        box-shadow: 2px 0 12px rgba(29, 78, 216, 0.04);
        cursor: pointer;
        transition: all 0.3s;
      "
      (click)="nav.toggleSidebar()"
      title="Expand sidebar"
    >
      <app-icon-button
        icon="heroChevronRightSolid"
        ariaLabel="Expand sidebar"
        title="Expand sidebar"
        size="sm"
        tone="secondary"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarCollapsedStripComponent {
  nav = inject(NavigationService);
}
