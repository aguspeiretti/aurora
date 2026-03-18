import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateCategory, useUpdateCategory } from '../hooks/useServices'

const PRESET_COLORS = [
  '#a87030', '#c9893a', '#c4856a', '#2d7a5f',
  '#3b82f6', '#06b6d4', '#10b981', '#84cc16',
  '#f59e0b', '#ef4444', '#f97316', '#6b7280',
]

const PRESET_EMOJIS = [
  '💅', '✨', '🌿', '💆', '🌸', '👁️', '🧖', '⭐',
  '💉', '🩺', '💊', '🔬', '🧴', '🪷', '🧘', '💪',
  '🦷', '👂', '🧠', '🫁', '🩻', '💆‍♀️', '🧖‍♀️', '💇',
]

export function CategoryForm({ category, onSuccess, onCancel }) {
  const { mutate: create, isPending: creating } = useCreateCategory()
  const { mutate: update, isPending: updating } = useUpdateCategory()
  const isPending = creating || updating

  const [name, setName] = useState(category?.name || '')
  const [icon, setIcon] = useState(category?.icon || '⭐')
  const [color, setColor] = useState(category?.color || '#a87030')
  const [customEmoji, setCustomEmoji] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const payload = { name: name.trim(), icon, color }
    if (category) {
      update({ id: category.id, ...payload }, { onSuccess })
    } else {
      create(payload, { onSuccess })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre de la categoría"
        required
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Ej: Rinoplastia, Botox, Laser CO2..."
      />

      {/* Emoji */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Ícono</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-colors
                ${icon === emoji ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={customEmoji}
            onChange={e => setCustomEmoji(e.target.value)}
            placeholder="O escribí un emoji personalizado"
            className="input-base text-sm flex-1"
          />
          {customEmoji && (
            <button
              type="button"
              onClick={() => { setIcon(customEmoji); setCustomEmoji('') }}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Usar
            </button>
          )}
          <div className="w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 border-brand-500 bg-brand-50">
            {icon}
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="opacity-0 absolute w-1 h-1" />
            <div className="w-full h-full rounded-full" style={{ backgroundColor: color }} />
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={isPending}>
          {category ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  )
}
