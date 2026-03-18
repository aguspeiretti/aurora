-- Missing RLS policies for staff_services and staff_branch_assignments
-- Both tables had RLS enabled but no policies, blocking the public booking portal

-- ── staff_services ─────────────────────────────────────────────────────────

-- Org members can manage staff services
CREATE POLICY "staff_services_select_org_member" ON staff_services
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff_profiles WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "staff_services_write_owner_manager" ON staff_services
  FOR ALL USING (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      WHERE user_is_owner_or_manager(sp.organization_id)
    )
  );

-- Public booking portal needs to read which staff can perform each service
CREATE POLICY "staff_services_public_read" ON staff_services
  FOR SELECT USING (true);

-- ── staff_branch_assignments ────────────────────────────────────────────────

-- Org members can read assignments
CREATE POLICY "staff_branch_select_org_member" ON staff_branch_assignments
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff_profiles WHERE organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY "staff_branch_write_owner_manager" ON staff_branch_assignments
  FOR ALL USING (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      WHERE user_is_owner_or_manager(sp.organization_id)
    )
  );

-- Public booking portal needs to know which staff are in which branch
CREATE POLICY "staff_branch_public_read" ON staff_branch_assignments
  FOR SELECT USING (true);
