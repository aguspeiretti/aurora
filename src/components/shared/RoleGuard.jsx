import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { hasPermission, roleHasHigherOrEqualLevel } from '@/lib/constants/roles'

/**
 * Restringe el renderizado según rol del usuario
 *
 * Uso:
 *   <RoleGuard permission="services.manage">
 *     <EditButton />
 *   </RoleGuard>
 *
 *   <RoleGuard minRole="manager">
 *     <ReportsLink />
 *   </RoleGuard>
 */
export function RoleGuard({ children, permission, minRole, fallback = null }) {
  const { userRole } = useOrgContext()

  if (!userRole) return fallback

  if (permission && !hasPermission(userRole, permission)) {
    return fallback
  }

  if (minRole && !roleHasHigherOrEqualLevel(userRole, minRole)) {
    return fallback
  }

  return children
}
