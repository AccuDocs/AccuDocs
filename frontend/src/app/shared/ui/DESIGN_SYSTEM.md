# Shared UI Contract

All shared UI primitives in this folder must follow the AccuDocs project design system in [frontend/DESIGN_SYSTEM.md](../../../../DESIGN_SYSTEM.md).

## Component Defaults

- `ui-button`: primary Blue Theme v2 accent `#1D4ED8`, secondary white, danger only for destructive actions, `8px` radius.
- `ui-input` and `ui-select`: `40px` medium height, `#D0D7DE` border, blue focus ring.
- `ui-badge`: accounting statuses use exact paid, pending, overdue, draft, and partial colors.
- `ui-card`: white card, `#E2EDFF` border, `12px` radius.
- `ui-stats-card`: KPI labels are uppercase `11px`; values are monospace.
- `ui-data-table`: zebra rows on by default, numeric columns right-aligned and monospace.
- `ui-skeleton`: use shimmer skeletons for page and table loading states.

## Required Data Behavior

- Amount columns must use `font-mono` and right alignment.
- Tables with amount data should include a total or summary footer where the feature owns the data.
- Empty tables must render `ui-empty-state` with useful guidance.
- Avoid decorative use of red, green, amber, or blue. These colors carry accounting meaning.

## Main Files

- [button.component.ts](atoms/button.component.ts)
- [input.component.ts](atoms/input.component.ts)
- [select.component.ts](atoms/select.component.ts)
- [badge.component.ts](atoms/badge.component.ts)
- [card.component.ts](molecules/card.component.ts)
- [skeleton.component.ts](molecules/skeleton.component.ts)
- [data-table.component.ts](organisms/data-table.component.ts)
