# AccuDocs Project Design System

AccuDocs is professional accounting software for accountants, bookkeepers, and finance teams. The UI should feel dense, calm, precise, and comfortable for long working sessions.

## Product Rules

- Product name: AccuDocs
- Tagline: Smart Accounting. Clear Books.
- Primary user: accountants and finance teams
- Currency: Indian Rupee, formatted as `₹1,25,000.00`
- Dates: `DD/MM/YYYY`
- GST: show GSTIN wherever client or invoice identity matters
- Default viewport: desktop-first, 1280px and above

## Canonical Tokens

The exact source tokens live in [styles.scss](src/styles.scss) as `--ad-*` variables. Do not invent alternate brand colors.

| Token | Value | Usage |
| --- | --- | --- |
| `--ad-sidebar-bg` | `#0F1E35` | Primary sidebar |
| `--ad-header-bg` | `#FFFFFF` | Header |
| `--ad-page-bg` | `#F0F5FF` | App canvas |
| `--ad-card-bg` | `#FFFFFF` | Cards and tables |
| `--ad-card-border` | `#E2EDFF` | Borders |
| `--ad-teal` | `#1D4ED8` | Primary actions, links |
| `--ad-teal-light` | `#EFF6FF` | Primary soft states |
| `--ad-teal-icon` | `#60A5FA` | Active sidebar icons |
| `--ad-text-primary` | `#0F1E35` | Amounts, names, headings |
| `--ad-text-secondary` | `#2D4A6A` | Body and table text |
| `--ad-text-muted` | `#7A90B0` | Labels and headers |
| `--ad-danger` | `#C53030` | Overdue, errors, destructive actions |
| `--ad-warning` | `#E1A800` | Pending and warnings |
| `--ad-info` | `#1D4ED8` | Draft and neutral info |

## Typography

- UI font: `DM Sans`, `system-ui`, `sans-serif`
- Money and numeric accounting values: `DM Mono`, `monospace`
- Page titles: `20px`, weight `600`
- Section titles: `16px`, weight `600`
- Body/table text: `14px` or `13px`
- Labels/table headers: `11px`, uppercase, `0.06em` letter spacing

## Layout

- Primary sidebar background: `#0F1E35`
- Secondary module sidebar: `196px`, white, `#E2EDFF` right border
- Header height: `60px`
- Header background: pure white
- Content background: `#F0F5FF`
- Content max width: `1200px`
- Standard content padding: `24px`

The current Angular shell uses a hub rail plus module sidebar. Keep its interaction model, but every shell surface must use the AccuDocs tokens above.

## Components

- Cards: white, `1px #E2EDFF`, `12px` radius, no decorative nesting
- Buttons: `40px` medium height, `8px` radius, `13px` medium text
- Inputs: `40px` height, `1px #D0D7DE`, `8px` radius, blue focus ring
- Badges: `6px` radius, `11px` medium text
- Tables: zebra rows for more than five rows, `48px` default row height, `40px` compact row height

## Accounting UX Rules

- Red is only for overdue, error, negative values, and destructive actions.
- Green is only for paid, success, revenue, and positive values.
- Amber is only for pending or warning.
- Blue is only for info or draft.
- All currency amounts, percentages, quantities, rates, debits, credits, balances, and totals use monospace and right alignment.
- Tables containing amounts should show totals in the footer or nearby summary.
- Empty states must include an icon, a short explanation, and an action where possible.
- Loading should use skeletons instead of full-page spinners.

## Shared Implementation

- Global tokens and utilities: [styles.scss](src/styles.scss)
- Tailwind token bridge: [tailwind.config.js](tailwind.config.js)
- Buttons: [button.component.ts](src/app/shared/ui/atoms/button.component.ts)
- Inputs: [input.component.ts](src/app/shared/ui/atoms/input.component.ts)
- Selects: [select.component.ts](src/app/shared/ui/atoms/select.component.ts)
- Badges: [badge.component.ts](src/app/shared/ui/atoms/badge.component.ts)
- Cards: [card.component.ts](src/app/shared/ui/molecules/card.component.ts)
- Skeletons: [skeleton.component.ts](src/app/shared/ui/molecules/skeleton.component.ts)
- Tables: [data-table.component.ts](src/app/shared/ui/organisms/data-table.component.ts)
- Legacy ngx table: [data-table.component.html](src/app/shared/data-table/data-table.component.html)

## Sample Data Standard

Use realistic Indian data in mockups:

- Sharma Enterprises Pvt. Ltd. | GSTIN `27AABCS1429B1ZB` | Mumbai
- Mehta Traders & Co. | GSTIN `24AACFM2345K1ZP` | Ahmedabad
- Patel Export House | GSTIN `24AAACP7645M1ZQ` | Surat
- Rajkumar Constructions | GSTIN `08AABCR6534N1ZF` | Jaipur
- Desai Tech Solutions Pvt. Ltd. | GSTIN `27AACFD3210H1ZT` | Pune

Default logged-in mock user: Rakesh Agarwal, `rakesh@accudocs.in`, Admin.
