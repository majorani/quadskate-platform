import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Usar estos en lugar de next/navigation en toda la app
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)