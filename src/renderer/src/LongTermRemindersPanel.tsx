import { useState, useEffect } from 'react'
import { LongTermReminder } from '../../types'
import { LongTermReminderForm } from './LongTermReminderForm'
import { applyOpacity } from './utils/colorUtils'

interface LongTermRemindersPanelProps {
  reminders: LongTermReminder[]
  onSaveReminders: (reminders: LongTermReminder[]) => void
  settings: any
}

const MAX_ITEMS = 8
const ITEMS_PER_COLUMN = 4

export function LongTermRemindersPanel({ reminders, onSaveReminders, settings }: LongTermRemindersPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<LongTermReminder | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; reminder: LongTermReminder } | null>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleSave = (reminderData: LongTermReminder) => {
    if (reminders.length >= MAX_ITEMS && !editingReminder) {
      alert(`最多只能添加 ${MAX_ITEMS} 个长期提醒事项，请先删除一些事项后再添加。`)
      return
    }

    let updated: LongTermReminder[]
    
    if (editingReminder) {
      updated = reminders.map(r =>
        r.id === reminderData.id ? { ...reminderData, updatedAt: new Date().toISOString() } : r
      )
    } else {
      const newReminder: LongTermReminder = {
        ...reminderData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      updated = [...reminders, newReminder]
    }

    onSaveReminders(updated)
    setIsFormOpen(false)
    setEditingReminder(null)
  }

  const handleEdit = (reminder: LongTermReminder) => {
    setEditingReminder(reminder)
    setIsFormOpen(true)
    setContextMenu(null)
  }

  const handleDelete = (id: string) => {
    const updated = reminders.filter(r => r.id !== id)
    onSaveReminders(updated)
    setContextMenu(null)
  }

  const handleDoubleClick = (reminder?: LongTermReminder) => {
    if (reminder) {
      setEditingReminder(reminder)
    } else {
      setEditingReminder(null)
    }
    setIsFormOpen(true)
  }

  const handleContextMenu = (e: React.MouseEvent, reminder: LongTermReminder) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, reminder })
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return '#fecaca'
      case 'medium': return '#fed7aa'
      default: return '#f3f4f6'
    }
  }

  const getImportanceTextColor = (importance: string) => {
    switch (importance) {
      case 'high': return '#991b1b'
      case 'medium': return '#9a3412'
      default: return '#1f2937'
    }
  }

  const getDisplayText = (reminder: LongTermReminder) => {
    if (reminder.description) {
      return `${reminder.title}（${reminder.description}）`
    }
    return reminder.title
  }

  const leftColumn = reminders.slice(0, ITEMS_PER_COLUMN)
  const rightColumn = reminders.slice(ITEMS_PER_COLUMN, MAX_ITEMS)

  return (
    <div 
      className="mt-2 border-t border-gray-200 pt-2"
      style={{ 
        backgroundColor: applyOpacity('#f9fafb', settings.windowOpacity)
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 
          className="text-xs font-medium"
          style={{ color: settings.calendarColor }}
        >
          长期提醒事项（双击新增，右击编辑/删除）
        </h3>
      </div>

      <div className="flex gap-1" style={{ height: '130px' }}>
        <div className="flex gap-1 flex-4" style={{ flex: 4 }}>
          <div className="flex flex-col gap-0.5 flex-1">
            {leftColumn.map(reminder => (
              <div
                key={reminder.id}
                className="rounded px-2 py-1 cursor-pointer text-xs truncate"
                style={{ 
                  backgroundColor: getImportanceColor(reminder.importance),
                  color: getImportanceTextColor(reminder.importance),
                  height: '30px'
                }}
                onDoubleClick={() => handleDoubleClick(reminder)}
                onContextMenu={(e) => handleContextMenu(e, reminder)}
              >
                {getDisplayText(reminder)}
              </div>
            ))}
            {Array.from({ length: ITEMS_PER_COLUMN - leftColumn.length }).map((_, i) => (
              <div
                key={`empty-left-${i}`}
                className="rounded px-2 py-1 cursor-pointer text-xs text-gray-300 hover:bg-gray-100 flex items-center"
                style={{ height: '30px' }}
                onDoubleClick={() => handleDoubleClick()}
              >
                +
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            {rightColumn.map(reminder => (
              <div
                key={reminder.id}
                className="rounded px-2 py-1 cursor-pointer text-xs truncate"
                style={{ 
                  backgroundColor: getImportanceColor(reminder.importance),
                  color: getImportanceTextColor(reminder.importance),
                  height: '30px'
                }}
                onDoubleClick={() => handleDoubleClick(reminder)}
                onContextMenu={(e) => handleContextMenu(e, reminder)}
              >
                {getDisplayText(reminder)}
              </div>
            ))}
            {Array.from({ length: ITEMS_PER_COLUMN - rightColumn.length }).map((_, i) => (
              <div
                key={`empty-right-${i}`}
                className="rounded px-2 py-1 cursor-pointer text-xs text-gray-300 hover:bg-gray-100 flex items-center"
                style={{ height: '30px' }}
                onDoubleClick={() => handleDoubleClick()}
              >
                +
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded"
             style={{ 
               flex: 3,
               backgroundColor: applyOpacity('#f3f4f6', settings.windowOpacity * 0.3)
             }}>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-400">待升级</div>
            <div className="text-xs text-gray-300 mt-1">预留区域</div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => handleEdit(contextMenu.reminder)}
          >
            ✏️ 编辑
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
            onClick={() => handleDelete(contextMenu.reminder.id)}
          >
            🗑️ 删除
          </button>
        </div>
      )}

      <LongTermReminderForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingReminder(null)
        }}
        onSave={handleSave}
        editingReminder={editingReminder}
      />
    </div>
  )
}
