import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LoaderComponent, LoaderSize, LoaderVariant } from '@ui/atoms/loader.component';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [LoaderComponent],
  template: `
    <div
      class="flex flex-1 items-center justify-center"
      [style.min-height]="minHeight()"
      role="status"
      [attr.aria-label]="label()"
    >
      <div class="rounded-2xl border border-border-color bg-surface-color px-6 py-5 shadow-card">
        <app-loader [size]="size()" [variant]="variant()" [label]="label()"></app-loader>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  label = input('Loading...');
  size = input<LoaderSize>('lg');
  variant = input<LoaderVariant>('primary');
  minHeight = input('420px');
}
