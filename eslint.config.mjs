import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Existing chart implementations use Recharts payloads and inline tooltips.
  // Keep those legacy exceptions local while checking all new code normally.
  {
    files: ['features/time-tracking/components/charts/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    files: ['lib/supabase/services/baseService.ts', 'lib/utils/chartData.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['app/(dashboard)/settings/page.tsx'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  {
    files: ['scripts/generate-favicons.js', 'tailwind.config.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['lib/utils/chartData.ts'],
    rules: { 'prefer-const': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
