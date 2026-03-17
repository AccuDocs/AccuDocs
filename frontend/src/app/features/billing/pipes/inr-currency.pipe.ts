import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'inrCurrency',
  standalone: true,
})
export class InrCurrencyPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    minimumFractionDigits: number = 2,
    maximumFractionDigits: number = 2
  ): string {
    const numericValue = typeof value === 'string' ? Number(value) : value;

    if (numericValue === null || numericValue === undefined || Number.isNaN(numericValue)) {
      return '₹0.00';
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numericValue);
  }
}
