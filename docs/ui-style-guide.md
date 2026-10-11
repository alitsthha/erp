# UI style guide

The shared theme lives in `src/index.css`. Use its Tailwind tokens rather than
adding individual hex colors to components.

Shared component recipes live in `src/styles/components.css`. New pages should
use these classes instead of copying long lists of appearance utilities:

| Class | Use |
| --- | --- |
| `ui-page` | Full-width page or form content within the dashboard shell |
| `ui-page-title` | Main page heading |
| `ui-section-title` | Card or form section heading |
| `ui-surface` | Bordered white cards and panels |
| `ui-field` | Text inputs, selects, and textareas |
| `ui-button` | Main page and form actions; add the appropriate color |
| `ui-table` / `ui-table-head` | Record tables and their header rows |

`DashboardLayout` owns the responsive page padding and 1280px content limit.
Pages must not add a second set of outer gutters. Keep modal widths independent.
Use `space-y-6` between major sections and `p-4 sm:p-5` inside form sections.

## Colors

- `bg-brand-600` / `text-white`: primary actions, using logo blue `#1776BC`.
- `hover:bg-brand-700`: primary action hover.
- `bg-brand-50` / `text-brand-700`: selected navigation and secondary accents.
- `border-brand-600` / `ring-brand-100`: form focus.
- `brand-green` (`#41B864`) and `brand-yellow` (`#FECD08`): logo accents and charts.
  Use dark text on these bright accents.
- Slate: body text, muted text, borders, and page backgrounds.
- Keep green success, amber warnings, and red errors/destructive actions meaningful.
- Activity colors are user data. Never replace them with the interface palette.

## Typography and shapes

- Geist is the shared font; body and controls use `text-sm` (14px).
- Page titles use `text-2xl font-semibold` (24px); section titles use `text-base`.
- Field labels and helper text use `text-sm` and `text-xs`, respectively.
- Form inputs and selects use `h-11` (44px) and `rounded-lg` (8px).
- Primary form/page actions use `min-h-11` and `rounded-lg`.
- Cards and standard panels use `rounded-xl` (12px).
- Large dialogs can use `rounded-2xl` (16px).
- Record table cells use `px-4 py-3`; keep row actions compact.
- Avatars, status pills, activity dots, and calendar navigation can stay circular.
- Preserve compact calendar cells and responsive seven-day layouts.

Calendar and attendance styles reference the shared CSS variables. Third-party
Nepali date-picker overrides live with the shared theme. Keep business logic,
status meanings, chart labels, and activity metadata independent of styling.
