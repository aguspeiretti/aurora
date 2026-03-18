-- Add banner_url to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ============================================================
-- Storage bucket: branding (logos & banners)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Org members can upload to their own org folder
CREATE POLICY "branding_upload_org_members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.profile_id = auth.uid()
      AND ou.active = true
      AND ou.role IN ('owner', 'manager')
      AND (storage.foldername(name))[1] = ou.organization_id::text
  )
);

-- Org members can update/replace their own org files
CREATE POLICY "branding_update_org_members"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.profile_id = auth.uid()
      AND ou.active = true
      AND ou.role IN ('owner', 'manager')
      AND (storage.foldername(name))[1] = ou.organization_id::text
  )
);

-- Org members can delete their own org files
CREATE POLICY "branding_delete_org_members"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding'
  AND EXISTS (
    SELECT 1 FROM organization_users ou
    WHERE ou.profile_id = auth.uid()
      AND ou.active = true
      AND ou.role IN ('owner', 'manager')
      AND (storage.foldername(name))[1] = ou.organization_id::text
  )
);

-- Public read (bucket is public, but add explicit policy for clarity)
CREATE POLICY "branding_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');
