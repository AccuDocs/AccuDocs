import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SuperAdminAuthService } from '../services/sa-auth.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSquares2x2Solid,
  heroBuildingOffice2Solid,
  heroCreditCardSolid,
  heroChartBarSquareSolid,
  heroDocumentTextSolid,
  heroBars3BottomLeftSolid,
  heroMegaphoneSolid,
  heroShieldCheckSolid,
  heroCog6ToothSolid,
  heroChevronLeftSolid,
  heroChevronRightSolid,
  heroChevronDownSolid,
  heroBellSolid,
  heroMagnifyingGlassSolid,
  heroArrowLeftOnRectangleSolid
} from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-super-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NgIconComponent],
  providers: [
    provideIcons({
      heroSquares2x2Solid,
      heroBuildingOffice2Solid,
      heroCreditCardSolid,
      heroChartBarSquareSolid,
      heroDocumentTextSolid,
      heroBars3BottomLeftSolid,
      heroMegaphoneSolid,
      heroShieldCheckSolid,
      heroCog6ToothSolid,
      heroChevronLeftSolid,
      heroChevronRightSolid,
      heroChevronDownSolid,
      heroBellSolid,
      heroMagnifyingGlassSolid,
      heroArrowLeftOnRectangleSolid
    })
  ],
  templateUrl: './super-admin-layout.component.html',
  styleUrls: ['./super-admin-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperAdminLayoutComponent implements OnInit {
  authService = inject(SuperAdminAuthService);
  router = inject(Router);

  sidebarCollapsed = signal(localStorage.getItem('sa_sidebar_collapsed') === 'true');
  currentRoute = signal('');
  userMenuOpen = signal(false);

  admin = this.authService.admin;

  adminInitials = computed(() => {
    const name = this.admin()?.name || '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] || '').toUpperCase();
  });

  currentPageTitle = computed(() => {
    const path = this.currentRoute();
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('organizations')) return 'Organizations';
    if (path.includes('subscriptions')) return 'Subscriptions';
    if (path.includes('analytics')) return 'Analytics';
    if (path.includes('service-templates')) return 'Service Templates';
    if (path.includes('audit-logs')) return 'Audit Logs';
    if (path.includes('announcements')) return 'Announcements';
    if (path.includes('admins')) return 'Super Admins';
    if (path.includes('settings')) return 'Settings';
    return 'Super Admin';
  });

  ngOnInit() {
    this.updateCurrentRoute();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => this.updateCurrentRoute());
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
    localStorage.setItem('sa_sidebar_collapsed', this.sidebarCollapsed().toString());
  }

  private updateCurrentRoute() {
    this.currentRoute.set(this.router.url);
  }

  logout() {
    this.authService.logout();
  }
}
