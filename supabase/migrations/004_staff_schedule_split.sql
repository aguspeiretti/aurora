-- Support split shifts: optional second time range per day (e.g. 09:00-13:00 and 16:00-20:00)
ALTER TABLE staff_schedules
  ADD COLUMN IF NOT EXISTS start_time_2 TIME,
  ADD COLUMN IF NOT EXISTS end_time_2   TIME;
