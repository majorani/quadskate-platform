import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['es', 'en', 'fr'],
  defaultLocale: 'es',
  localePrefix: 'as-needed', // ES sin prefijo (/), EN con (/en/...), FR con (/fr/...)
})