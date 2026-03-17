import { z } from 'zod';

export const GetForecastsSchema = z.object({
  yearId: z.string().regex(/^FY\d{2}-\d{2}$/, 'Financial year must be in format FY23-24') // Or just standard string validation if ID is generic
});

export const ClientParamSchema = z.object({
  clientId: z.string().uuid('Invalid Client ID')
});
