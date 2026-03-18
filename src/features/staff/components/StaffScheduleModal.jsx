import { useState, useEffect, useRef } from 'react'
import * as Switch from '@radix-ui/react-switch'
import { Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useStaffSchedule, useSaveStaffSchedule } from '../hooks/useStaff'

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

function emptyDay(key) {
  return { day_of_week: key, active: false, start_time: '09:00', end_time: '18:00', split: false, start_time_2: '16:00', end_time_2: '20:00' }
}

function TimeRange({ start, end, onStartChange, onEndChange }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="time"
        value={start}
        onChange={e => onStartChange(e.target.value)}
        className="input-base text-sm py-1 px-2 w-28"
      />
      <span className="text-gray-400 text-xs shrink-0">→</span>
      <input
        type="time"
        value={end}
        onChange={e => onEndChange(e.target.value)}
        className="input-base text-sm py-1 px-2 w-28"
      />
    </div>
  )
}

export function StaffScheduleModal({ open, onClose, staff }) {
  const { data: savedSchedule = [], isLoading } = useStaffSchedule(staff?.id)
  const { mutate: save, isPending } = useSaveStaffSchedule(staff?.id)

  const [days, setDays] = useState(DAYS.map(d => emptyDay(d.key)))

  // Track which staffId we've already loaded into local state.
  // Using a ref avoids adding setDays or savedSchedule to deps, which would
  // re-fire the effect every time React Query returns a fresh array reference.
  const loadedFor = useRef(null)

  useEffect(() => {
    if (!savedSchedule.length || loadedFor.current === staff?.id) return
    loadedFor.current = staff?.id
    setDays(DAYS.map(d => {
      const saved = savedSchedule.find(s => s.day_of_week === d.key)
      if (!saved) return emptyDay(d.key)
      return {
        day_of_week: d.key,
        active: true,
        start_time: saved.start_time.slice(0, 5),
        end_time: saved.end_time.slice(0, 5),
        split: !!(saved.start_time_2 && saved.end_time_2),
        start_time_2: saved.start_time_2 ? saved.start_time_2.slice(0, 5) : '16:00',
        end_time_2: saved.end_time_2 ? saved.end_time_2.slice(0, 5) : '20:00',
      }
    }))
  }, [savedSchedule, staff?.id])

  function update(key, patch) {
    setDays(prev => prev.map(d => d.day_of_week === key ? { ...d, ...patch } : d))
  }

  function applyToAll(sourceKey) {
    const source = days.find(d => d.day_of_week === sourceKey)
    if (!source) return
    setDays(prev => prev.map(d =>
      d.active && d.day_of_week !== sourceKey
        ? { ...d, start_time: source.start_time, end_time: source.end_time, split: source.split, start_time_2: source.start_time_2, end_time_2: source.end_time_2 }
        : d
    ))
  }

  return (
    <Modal open={open} onOpenChange={o => { if (!o) onClose() }} title={`Horarios — ${staff?.display_name}`} size="md">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((day, idx) => {
            const label = DAYS[idx].label
            return (
              <div
                key={day.day_of_week}
                className={`rounded-xl border p-3 transition-colors space-y-2
                  ${day.active ? 'border-brand-200 bg-brand-50' : 'border-gray-100 bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  {/* Radix Switch */}
                  <Switch.Root
                    checked={day.active}
                    onCheckedChange={v => update(day.day_of_week, { active: v })}
                    className="w-10 h-5 rounded-full bg-gray-300 data-[state=checked]:bg-brand-600 transition-colors relative shrink-0 outline-none"
                  >
                    <Switch.Thumb className="block w-4 h-4 rounded-full bg-white shadow-sm transition-transform translate-x-0.5 data-[state=checked]:translate-x-5" />
                  </Switch.Root>

                  <span className={`text-sm font-medium w-20 shrink-0 ${day.active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </span>

                  {day.active ? (
                    <>
                      <TimeRange
                        start={day.start_time}
                        end={day.end_time}
                        onStartChange={v => update(day.day_of_week, { start_time: v })}
                        onEndChange={v => update(day.day_of_week, { end_time: v })}
                      />
                      <div className="flex items-center gap-2 ml-auto">
                        {!day.split && (
                          <button
                            type="button"
                            onClick={() => update(day.day_of_week, { split: true })}
                            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                            title="Agregar horario cortado"
                          >
                            <Plus className="w-3 h-3" /> Turno
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => applyToAll(day.day_of_week)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                          title="Copiar a todos los días activos"
                        >
                          Aplicar a todos
                        </button>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">No trabaja</span>
                  )}
                </div>

                {/* Segunda franja horaria */}
                {day.active && day.split && (
                  <div className="flex items-center gap-3 pl-13">
                    <span className="w-10 shrink-0" />
                    <span className="text-xs text-gray-400 w-20 shrink-0">2° turno</span>
                    <TimeRange
                      start={day.start_time_2}
                      end={day.end_time_2}
                      onStartChange={v => update(day.day_of_week, { start_time_2: v })}
                      onEndChange={v => update(day.day_of_week, { end_time_2: v })}
                    />
                    <button
                      type="button"
                      onClick={() => update(day.day_of_week, { split: false, start_time_2: '16:00', end_time_2: '20:00' })}
                      className="ml-auto text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-3 justify-end pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save(days, { onSuccess: onClose })} loading={isPending}>
              Guardar horarios
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
