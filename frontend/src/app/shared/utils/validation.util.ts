import { signal } from '@angular/core';
import type { ZodSchema } from 'zod/v4';

export function validateSchema<T>(schema: ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true as const, data: result.data, errors: null };
  } else {
    const errors = result.error.flatten().fieldErrors;
    return { success: false as const, data: null, errors };
  }
}

/**
 * Senior Signal-based form state helper
 */
export function createFormState<T>(initialValue: T, schema: ZodSchema<T>) {
  const value = signal<T>(initialValue);
  const errors = signal<Partial<Record<keyof T, string[]>>>({});
  const isSubmitting = signal(false);

  const validate = () => {
    const result = validateSchema(schema, value());
    if (!result.success) {
      errors.set(result.errors as any);
    } else {
      errors.set({});
    }
    return result.success;
  };

  return {
    value,
    errors,
    isSubmitting,
    validate,
  };
}
