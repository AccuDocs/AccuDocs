import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LoaderSize, LoaderVariant } from '@ui/atoms/loader.component';
import { SkeletonComponent } from '@ui/molecules/skeleton.component';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <div
      class="flex flex-1 items-start justify-center p-6"
      [style.min-height]="minHeight()"
      role="status"
      [attr.aria-label]="label()"
    >
      <div class="w-full max-w-content rounded-xl border border-border-color bg-surface p-5">
        <span class="sr-only">{{ label() }}</span>
        <div class="mb-5 grid gap-4 md:grid-cols-4">
          <ui-skeleton height="88px" [rounded]="true"></ui-skeleton>
          <ui-skeleton height="88px" [rounded]="true"></ui-skeleton>
          <ui-skeleton height="88px" [rounded]="true"></ui-skeleton>
          <ui-skeleton height="88px" [rounded]="true"></ui-skeleton>
        </div>
        <ui-skeleton height="44px" [rounded]="true"></ui-skeleton>
        <div class="mt-3 space-y-2">
          <ui-skeleton height="48px" [rounded]="true"></ui-skeleton>
          <ui-skeleton height="48px" [rounded]="true"></ui-skeleton>
          <ui-skeleton height="48px" [rounded]="true"></ui-skeleton>
          <ui-skeleton height="48px" [rounded]="true"></ui-skeleton>
        </div>
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
