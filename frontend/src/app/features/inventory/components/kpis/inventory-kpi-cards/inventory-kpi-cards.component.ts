import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryKpiCardComponent } from '../inventory-kpi-card/inventory-kpi-card.component';
import type { InventoryKpi } from '../../../models/inventory-dashboard.models';

@Component({
  selector: 'app-inventory-kpi-cards',
  standalone: true,
  imports: [CommonModule, InventoryKpiCardComponent],
  template: `
    <section class="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      @for (card of cards(); track card.label) {
        <app-inventory-kpi-card [kpi]="card" [loading]="loading()"></app-inventory-kpi-card>
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
  `],
})
export class InventoryKpiCardsComponent {
  readonly cards = input.required<InventoryKpi[]>();
  readonly loading = input(false);
}
