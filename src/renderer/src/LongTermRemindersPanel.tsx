import { useState, useEffect } from 'react'
import { LongTermReminder, StickyNote } from '../../types'
import { LongTermReminderForm } from './LongTermReminderForm'
import { StickyNoteForm } from './StickyNoteForm'
import { StickyNotesPanel } from './StickyNotesPanel'
import { applyOpacity } from './utils/colorUtils'

interface LongTermRemindersPanelProps {
  reminders: LongTermReminder[]
  onSaveReminders: (reminders: LongTermReminder[]) => void
  stickyNotes: StickyNote[]
  onSaveStickyNotes: (notes: StickyNote[]) => void
  settings: any
}

const MAX_ITEMS = 4

export function LongTermRemindersPanel({
  reminders,
  onSaveReminders,
  stickyNotes,
  onSaveStickyNotes,
  settings
}: LongTermRemindersPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<LongTermReminder | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; reminder: LongTermReminder } | null>(null)
  const [isStickyFormOpen, setIsStickyFormOpen] = useState(false)
  const [editingStickyNote, setEditingStickyNote] = useState<StickyNote | null>(null)

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

  const handleStickyAdd = () => {
    setEditingStickyNote(null)
    setIsStickyFormOpen(true)
  }

  const handleStickyEdit = (note: StickyNote) => {
    setEditingStickyNote(note)
    setIsStickyFormOpen(true)
  }

  const handleStickyDelete = (id: string) => {
    onSaveStickyNotes(stickyNotes.filter(n => n.id !== id))
  }

  const handleStickyComplete = (id: string) => {
    onSaveStickyNotes(
      stickyNotes.map(n =>
        n.id === id ? { ...n, completedAt: new Date().toISOString() } : n
      )
    )
  }

  const handleStickySave = (noteData: StickyNote) => {
    let updated: StickyNote[]
    if (editingStickyNote) {
      updated = stickyNotes.map(n => (n.id === editingStickyNote.id ? { ...noteData } : n))
    } else {
      const newNote: StickyNote = {
        ...noteData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }
      updated = [...stickyNotes, newNote]
    }
    onSaveStickyNotes(updated)
    setIsStickyFormOpen(false)
    setEditingStickyNote(null)
  }

  const leftColumn = reminders.slice(0, MAX_ITEMS)

  return (
    <div 
      className="mt-2 border-t border-gray-200 pt-2"
      style={{ 
        backgroundColor: applyOpacity('#f9fafb', settings.windowOpacity)
      }}
    >
      <div className="flex items-center mb-1" style={{ height: '20px' }}>
        <h3 
          className="text-xs font-medium"
          style={{ color: settings.calendarColor, flex: 1 }}
        >
          长期提醒事项（双击新增，右击编辑/删除）
        </h3>
        <h3 
          className="text-xs font-medium"
          style={{ color: settings.calendarColor, flex: 1 }}
        >
          便签（双击新增，右击编辑/删除/标记完成）
        </h3>
        <div style={{ flex: 1 }}></div>
      </div>

      <div className="flex gap-1" style={{ height: '130px' }}>
        {/* 长期提醒事项：单列4条 */}
        <div className="flex flex-col gap-0.5" style={{ flex: 1 }}>
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
          {Array.from({ length: MAX_ITEMS - leftColumn.length }).map((_, i) => (
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

        {/* 便签区域 */}
        <StickyNotesPanel
          notes={stickyNotes}
          onAdd={handleStickyAdd}
          onEdit={handleStickyEdit}
          onDelete={handleStickyDelete}
          onComplete={handleStickyComplete}
          calendarColor={settings.calendarColor}
        />

        {/* 待升级预留区域 */}
        <div className="flex items-center justify-center border border-gray-200 rounded"
             style={{ 
               flex: 1,
               backgroundColor: applyOpacity('#f3f4f6', settings.windowOpacity * 0.3)
             }}>
          <div className="text-center">
            <div className="text-xs font-medium text-gray-400">待升级</div>
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

      <StickyNoteForm
        isOpen={isStickyFormOpen}
        onClose={() => {
          setIsStickyFormOpen(false)
          setEditingStickyNote(null)
        }}
        onSave={handleStickySave}
        editingNote={editingStickyNote}
      />
    </div>
  )
}
