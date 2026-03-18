-- RLS policies for staff_schedules (were missing, table was locked down)

-- Org members can read schedules of their org's staff
CREATE POLICY "staff_schedules_select_org_member" ON staff_schedules
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff_profiles WHERE organization_id = ANY(get_user_org_ids())
    )
  );

-- Owner / manager can insert and update schedules
CREATE POLICY "staff_schedules_insert_owner_manager" ON staff_schedules
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      WHERE user_is_owner_or_manager(sp.organization_id)
    )
  );

CREATE POLICY "staff_schedules_update_owner_manager" ON staff_schedules
  FOR UPDATE USING (
    staff_id IN (
      SELECT sp.id FROM staff_profiles sp
      WHERE user_is_owner_or_manager(sp.organization_id)
    )
  );

-- Public booking portal can read active schedules (no auth required)
CREATE POLICY "staff_schedules_public_read" ON staff_schedules
  FOR SELECT USING (active = true);
