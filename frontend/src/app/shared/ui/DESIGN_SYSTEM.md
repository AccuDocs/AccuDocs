# AccuDocs SaaS Design System

This document captures the target design system for the AccuDocs SaaS experience.

It is written for designers first, but it also maps to the current frontend implementation so designers and developers can stay aligned.

## Purpose

- Product type: SaaS platform for GST workflows and client management
- Primary users: CAs, accountants, and business users
- UX goal: clean, professional, low-fatigue interfaces that remain comfortable during long working hours

## Product Direction

- Clarity over decoration
- Minimal cognitive load
- Consistent visual hierarchy
- Action-focused UI
- Data readability first

## Color System

### Brand

| Token | Value | Usage |
| --- | --- | --- |
| Primary | `#4F46E5` | Primary CTA, active states, focus accents |
| Primary Hover | `#4338CA` | Hover state for primary controls |
| Primary Light | `#EEF2FF` | Secondary actions, soft selected states |

### Semantic

| Token | Value | Usage |
| --- | --- | --- |
| Success | `#16A34A` | ITC, credits, success confirmations |
| Danger | `#DC2626` | GST payable, destructive states, critical alerts |
| Warning | `#F59E0B` | Pending, missing, attention-required states |
| Info | `#0284C7` | Neutral data emphasis and informational UI |

### Surfaces

| Token | Value | Usage |
| --- | --- | --- |
| Page Background | `#F8FAFC` | Main app background |
| Card Background | `#FFFFFF` | Cards, tables, panels |
| Soft Background | `#F1F5F9` | Subtle section blocks and inputs |
| Hover Background | `#F1F5F9` | Row hover, button hover, selection support |

### Layout Surfaces

| Area | Value |
| --- | --- |
| Sidebar | `#FFFFFF` |
| Sub-sidebar | `#F8FAFC` |
| Header | `rgba(255,255,255,0.8)` with blur |

### Borders

| Token | Value |
| --- | --- |
| Border Color | `#E2E8F0` |

## Typography

### Font Family

- Primary font: `Inter`

### Font Sizes

| Size | Usage |
| --- | --- |
| `12px` | Labels and small helper text |
| `13px` | Dense table content |
| `14px` | Default body text |
| `16px` | Important values |
| `18px` | Section titles |
| `22px` | Page titles |
| `28px` | Main headings |

### Font Weights

| Weight | Value |
| --- | --- |
| Regular | `400` |
| Medium | `500` |
| Semi-bold | `600` |

### Typography Rules

- Use a maximum of two font weights per screen
- Avoid excessive bold usage
- Maintain a stable hierarchy across all modules
- Prefer readable density over visual drama

## Spacing System

Use an `8px` grid.

| Token | Value | Usage |
| --- | --- | --- |
| Micro | `4px` | Tiny offsets, icon gaps |
| Tight | `8px` | Dense control spacing |
| Default | `16px` | Standard padding and gaps |
| Section | `24px` | Group spacing |
| Large | `32px` | Major blocks and page rhythm |

## Radius

| Component | Radius |
| --- | --- |
| Inputs | `6px` |
| Buttons | `10px` |
| Cards | `12px` |
| Modals | `16px` |

## Shadows

| Token | Value | Usage |
| --- | --- | --- |
| Small | `0 1px 2px rgba(0,0,0,0.05)` | Subtle controls |
| Medium | `0 4px 12px rgba(0,0,0,0.05)` | Cards |
| Large | `0 10px 25px rgba(0,0,0,0.08)` | Dropdowns and overlays |

Rules:

- Use medium shadow for cards
- Use large shadow for dropdowns
- Avoid heavy or decorative shadows

## Layout Structure

### Global Shell

- Left sidebar fixed
- Top header sticky
- Main content area scrollable

### Sizing

| Area | Target |
| --- | --- |
| Sidebar | `~240px` |
| Sub-sidebar | `~220px` |
| Header height | `60px` |
| Content padding | `16px` to `24px` |

## Component Rules

### Cards

- Background: white
- Border: `1px solid #E2E8F0`
- Radius: `12px`
- Padding: `16px`
- Shadow: medium

### Buttons

Primary button:

- Background: `#4F46E5`
- Text: white
- Radius: `10px`
- Padding: `8px 16px`

Secondary button:

- Background: `#EEF2FF`
- Text: `#4F46E5`

### Inputs

- Border: `1px solid #E2E8F0`
- Radius: `6px`
- Padding: `8px 12px`

Focus state:

- Border color switches to primary
- Add a soft glow outline

### Tables

- Header background: `#F8FAFC`
- Row hover: `#F1F5F9`
- Row divider: `1px solid #E2E8F0`
- Prioritize legibility for dense numeric data

### Badges

| Variant | Background | Text Intent |
| --- | --- | --- |
| Success | `#DCFCE7` | Green semantic text |
| Danger | `#FEE2E2` | Red semantic text |
| Warning | `#FEF3C7` | Orange semantic text |

## Data Visualization

| Metric | Color |
| --- | --- |
| Sales | Primary indigo |
| Purchases | Info blue |
| ITC | Success green |
| GST Payable | Danger red |

## UX Rules

- Always show the active client context clearly
- Make the primary action visually obvious
- Reduce click count through direct navigation
- Use consistent color meaning across all modules
- Avoid clutter and decorative overload

## Micro-Interactions

- Hover: light background change
- Card hover: slight lift
- Button click: subtle scale down

## Dark Mode

Future optional mode:

| Token | Value |
| --- | --- |
| Background | `#0F172A` |
| Card | `#1E293B` |
| Text | Light gray |

## Expected Outcome

- Clean SaaS look
- Professional and trustworthy tone
- Fast data scanning
- Comfortable long-session usage

## Notes For Designers

- Focus on usability, not decoration
- Maintain consistency across screens
- Use spacing and hierarchy strictly
- Avoid over-designing controls or dashboards

## Frontend Mapping

These are the current implementation entry points for the design system:

- Global CSS tokens: [frontend/src/styles.scss](../../../styles.scss)
- Tailwind theme tokens: [frontend/tailwind.config.js](../../../../tailwind.config.js)
- Theme service: [frontend/src/app/core/services/theme.service.ts](../../core/services/theme.service.ts)
- Buttons: [atoms/button.component.ts](./atoms/button.component.ts)
- Inputs: [atoms/input.component.ts](./atoms/input.component.ts)
- Badges: [atoms/badge.component.ts](./atoms/badge.component.ts)
- Cards: [molecules/card.component.ts](./molecules/card.component.ts)
- Search: [molecules/search-bar.component.ts](./molecules/search-bar.component.ts)
- Modals: [molecules/modal.component.ts](./molecules/modal.component.ts)
- Page header: [organisms/page-header.component.ts](./organisms/page-header.component.ts)
- Admin header layout: [frontend/src/app/layouts/admin-layout/components/header.component.ts](../../layouts/admin-layout/components/header.component.ts)
- Favorites bar: [frontend/src/app/layout/favorites-bar/favorites-bar.component.ts](../../layout/favorites-bar/favorites-bar.component.ts)

## Current Implementation Notes

The current frontend is close in structure, but not yet fully aligned with this target system.

- The live primary brand in code is still blue-driven in several tokens and components.
- Some layout primitives still use legacy `--color-*` tokens alongside the newer token set.
- The current app shell uses a taller header than this document's `60px` target.
- Existing global radius tokens are more uniform than the component-specific radius system defined here.
- Dark mode already exists in code, while this document treats it as a future or optional mode.

This document should be treated as the target reference for future UI alignment work.
