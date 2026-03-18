import { useOrgContext } from '@/app/providers/OrganizationProvider'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useState, useRef } from 'react'
import { Upload, X, Image, Palette } from 'lucide-react'

export function BrandingSettingsPage() {
  const { currentOrg, refetch } = useOrgContext()
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState(currentOrg?.logo_url || null)
  const [bannerPreview, setBannerPreview] = useState(currentOrg?.banner_url || null)
  const logoInputRef = useRef()
  const bannerInputRef = useRef()

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      primary_color:   currentOrg?.primary_color   || '#a87030',
      secondary_color: currentOrg?.secondary_color || '#2d7a5f',
    },
  })

  const primaryColor   = watch('primary_color')
  const secondaryColor = watch('secondary_color')

  async function uploadImage(file, field, setUploading, setPreview) {
    if (!file) return null
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${currentOrg.id}/${field}-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('branding').getPublicUrl(path)
      const publicUrl = data.publicUrl

      const { error: dbErr } = await supabase
        .from('organizations')
        .update({ [field]: publicUrl })
        .eq('id', currentOrg.id)
      if (dbErr) throw dbErr

      setPreview(publicUrl)
      toast.success('Imagen actualizada')
      refetch?.()
      return publicUrl
    } catch (err) {
      toast.error('Error subiendo imagen: ' + err.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  async function removeImage(field, setPreview) {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ [field]: null })
        .eq('id', currentOrg.id)
      if (error) throw error
      setPreview(null)
      toast.success('Imagen eliminada')
      refetch?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function onSubmit(data) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', currentOrg.id)
      if (error) throw error

      // Apply theme immediately
      document.documentElement.style.setProperty('--brand-primary',   data.primary_color)
      document.documentElement.style.setProperty('--brand-secondary', data.secondary_color)

      toast.success('Colores guardados')
      refetch?.()
    } catch (err) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Logo */}
      <Card>
        <CardTitle className="mb-4 flex items-center gap-2">
          <Image size={18} /> Logo
        </CardTitle>
        <div className="flex items-start gap-6">
          {/* Preview */}
          <div
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0"
          >
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              : <Image size={32} className="text-gray-300" />
            }
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-600">
              Aparece en el portal de reservas y en los correos enviados a clientes.
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WebP o SVG · máx. 5 MB · recomendado 512×512 px</p>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={logoUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload size={14} /> Subir logo
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => removeImage('logo_url', setLogoPreview)}
                >
                  <X size={14} /> Quitar
                </Button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={e => uploadImage(e.target.files[0], 'logo_url', setLogoUploading, setLogoPreview)}
            />
          </div>
        </div>
      </Card>

      {/* Banner */}
      <Card>
        <CardTitle className="mb-4 flex items-center gap-2">
          <Image size={18} /> Banner / portada
        </CardTitle>
        <div className="flex flex-col gap-3">
          <div
            className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 relative"
          >
            {bannerPreview
              ? <>
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage('banner_url', setBannerPreview)}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                  >
                    <X size={14} className="text-gray-600" />
                  </button>
                </>
              : <div className="flex flex-col items-center gap-1 text-gray-300">
                  <Image size={32} />
                  <span className="text-xs">Sin banner</span>
                </div>
            }
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={bannerUploading}
              onClick={() => bannerInputRef.current?.click()}
            >
              <Upload size={14} /> Subir banner
            </Button>
            <span className="text-xs text-gray-400">PNG, JPG, WebP · máx. 5 MB · recomendado 1200×400 px</span>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => uploadImage(e.target.files[0], 'banner_url', setBannerUploading, setBannerPreview)}
          />
        </div>
      </Card>

      {/* Colors */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <Palette size={18} /> Colores de marca
          </CardTitle>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Color primario</label>
              <input
                type="color"
                className="h-12 w-full rounded-xl border border-gray-200 cursor-pointer p-1"
                {...register('primary_color')}
              />
              <p className="text-xs text-gray-400">Botones, links y elementos activos</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Color secundario</label>
              <input
                type="color"
                className="h-12 w-full rounded-xl border border-gray-200 cursor-pointer p-1"
                {...register('secondary_color')}
              />
              <p className="text-xs text-gray-400">Acentos y degradados</p>
            </div>
          </div>
        </Card>

        {/* Live preview */}
        <Card>
          <CardTitle className="mb-4">Vista previa</CardTitle>
          <div
            className="rounded-2xl overflow-hidden border border-gray-100"
            style={{ background: `linear-gradient(135deg, ${primaryColor}18, ${secondaryColor}18)` }}
          >
            {/* Banner strip */}
            {bannerPreview && (
              <div className="h-20 overflow-hidden">
                <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="" className="w-full h-full object-contain rounded-xl p-0.5" />
                  : currentOrg?.name?.[0]?.toUpperCase() || 'B'
                }
              </div>
              <div>
                <p className="font-bold text-gray-900">{currentOrg?.name}</p>
                <p className="text-xs" style={{ color: primaryColor }}>Portal de reservas</p>
              </div>
              <button
                type="button"
                className="ml-auto px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                Reservar turno
              </button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>Guardar colores</Button>
        </div>
      </form>
    </div>
  )
}
