import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['es', 'en', 'fr'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}