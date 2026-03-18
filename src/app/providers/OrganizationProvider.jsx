import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthContext } from './AuthProvider'

const OrganizationContext = createContext(null)

export function OrganizationProvider({ children }) {
  const { user } = useAuthContext()
  const [organizations, setOrganizations] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [currentBranch, setCurrentBranch] = useState(null)
  const [branches, setBranches] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setOrganizations([])
      setCurrentOrg(null)
      setCurrentBranch(null)
      setBranches([])
      setUserRole(null)
      setLoading(false)
      return
    }
    loadUserOrganizations()
  }, [user])

  async function loadUserOrganizations() {
    setLoading(true)
    try {
      const { data: orgUsers } = await supabase
        .from('organization_users')
        .select(`
          role,
          active,
          organization:organizations(*)
        `)
        .eq('profile_id', user.id)
        .eq('active', true)

      if (!orgUsers?.length) {
        setLoading(false)
        return
      }

      const orgs = orgUsers.map(ou => ({ ...ou.organization, role: ou.role }))
      setOrganizations(orgs)

      // Restaurar org guardada o usar la primera
      const savedOrgId = localStorage.getItem('beauty_desk_org_id')
      const selectedOrg = orgs.find(o => o.id === savedOrgId) || orgs[0]
      await selectOrganization(selectedOrg)
    } catch (err) {
      console.error('Error loading organizations:', err)
    } finally {
      setLoading(false)
    }
  }

  function applyOrgTheme(org) {
    const root = document.documentElement
    root.style.setProperty('--brand-primary',   org?.primary_color   || '#a87030')
    root.style.setProperty('--brand-secondary', org?.secondary_color || '#2d7a5f')
  }

  async function selectOrganization(org) {
    setCurrentOrg(org)
    applyOrgTheme(org)
    localStorage.setItem('beauty_desk_org_id', org.id)

    // Cargar sucursales
    const { data: branchList } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', org.id)
      .eq('active', true)
      .order('sort_order')

    setBranches(branchList || [])

    // Restaurar branch guardada o usar la primera
    const savedBranchId = localStorage.getItem('beauty_desk_branch_id')
    const selectedBranch =
      branchList?.find(b => b.id === savedBranchId) || branchList?.[0]
    if (selectedBranch) selectBranch(selectedBranch)

    setUserRole(org.role)
  }

  function selectBranch(branch) {
    setCurrentBranch(branch)
    localStorage.setItem('beauty_desk_branch_id', branch.id)
  }

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        currentBranch,
        branches,
        userRole,
        loading,
        selectOrganization,
        selectBranch,
        refetch: loadUserOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrgContext() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrgContext must be used inside OrganizationProvider')
  return ctx
}
