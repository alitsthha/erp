# Firebase setup

Local development and production builds use separate Firebase projects. See [Firebase environments](docs/firebase-environments.md) for configuration, backup, and deployment instructions.

# Monthly billing preview

In Billing → Bills not generated, the from/to dates represent billing run dates. Days 1–4 belong to the previous BS month; days 5 onward belong to the selected month. The preview covers the complete corresponding month or months. For example, 2083-06-28 through 2083-07-04 covers all of 2083-06, including attendance earlier in that month.

The missing-bill count reconciles the full current student list: total students = students with an invoice dated within the exact selected from/to range + students without an invoice dated in that range. Both boundary dates are included, regardless of the invoice’s billing month. A student is counted once even if multiple invoices exist. Cancelled/deleted invoices do not count as generated bills. The expanded list separates students with calculated fees from students needing review (such as inactive students, missing enrollments, unconfigured fees or no chargeable attendance); these students are no longer silently omitted. Counts update automatically when students, enrollments, invoices or attendance change. Calculated amounts exclude fees already reserved on an invoice. Session fees include recorded attendance through today. Invoice issue dates remain separate from the months being billed.

# Finance overview details

Click any Finance overview card to open the records behind its total. Outstanding and Expected Income support selecting multiple activities; the list and total update together. Outstanding invoice balances are allocated proportionally across their activity lines after invoice-level discounts and payments, with rounding that preserves the full outstanding amount. Manual invoices without an activity appear under Unassigned.

Expected Income covers a complete BS month selected by month and year, using current active students and enrollments. Monthly enrollments keep their flat monthly fee. When an activity has attendance records in that month, session enrollments use their distinct Present attendance dates multiplied by the session rate (Absent and missing student marks are not charged). Duplicate, deleted, future, out-of-month and pre-enrollment sessions are excluded, and legacy daily attendance follows the same fallback rules as billing. Activities without attendance data use their planned session count or configured monthly fee, clearly marked as planned. Attendance changes update both the overview and detail page. Amounts are before discounts, advances and payments. Cash and bank overview totals retain their existing meaning of recorded receipts, without subtracting expenses or adding opening balances.

# Email delivery

Invoice emails and attendance alerts are written to the Firestore `mail` collection. Invoice emails include the generated PDF as a base64 attachment.

To enable delivery for the configured Firebase project:

```sh
firebase login
firebase ext:install firestore-send-email
```

During setup, use `mail` as the Firestore mail collection, set the default sender to the academy email, and configure Gmail SMTP with a Google app password. Do not commit the SMTP password. Deploy the extension after setup with `firebase deploy --only extensions`.

The app uses `guardianEmail`, then `parentEmail`, as the parent contact; invoices fall back to `studentEmail` when no parent address is saved.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
