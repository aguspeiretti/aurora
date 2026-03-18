-- Fix default brand colors: replace old purple/pink defaults with Aurora gold/jade
-- Organizations that still have the original purple (#d946ef) or pink (#f43f5e)
-- defaults are updated to the correct brand palette.

ALTER TABLE organizations
  ALTER COLUMN primary_color   SET DEFAULT '#a87030',
  ALTER COLUMN secondary_color SET DEFAULT '#2d7a5f';

UPDATE organizations
  SET primary_color = '#a87030'
  WHERE primary_color = '#d946ef';

UPDATE organizations
  SET secondary_color = '#2d7a5f'
  WHERE secondary_color = '#f43f5e';
