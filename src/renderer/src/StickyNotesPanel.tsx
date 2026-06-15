import { useState } from 'react'
import { StickyNote } from './types'

interface StickyNotesPanelProps {
  notes: StickyNote[]
  onAdd: () => void
  onEdit: (note: StickyNote) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
  calendarColor?: string
}

export function StickyNotesPanel({ notes, onAdd, onEdit, onDelete, onComplete, calendarColor }: StickyNotesPanelProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    note: StickyNote
  } | null>(null)

  // 只显示未完成的便签
  const unfinishedNotes = notes.filter(note => !note.completedAt)

  const handleDoubleClick = () => {
    onAdd()
  }

  const handleContextMenu = (e: React.MouseEvent, note: StickyNote) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      note
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleEdit = () => {
    if (contextMenu) {
      onEdit(contextMenu.note)
      closeContextMenu()
    }
  }

  const handleDelete = () => {
    if (contextMenu) {
      if (confirm('确定删除这个便签吗？')) {
        onDelete(contextMenu.note.id)
        closeContextMenu()
      }
    }
  }

  const handleComplete = () => {
    if (contextMenu) {
      if (confirm('确定标记为完成吗？')) {
        onComplete(contextMenu.note.id)
        closeContextMenu()
      }
    }
  }

  // 根据重要程度返回背景色
  const getImportanceColor = (importance: 'low' | 'medium' | 'high') => {
    switch (importance) {
      case 'high':
        return '#fecaca' // 淡红
      case 'medium':
        return '#fed7aa' // 淡橙
      case 'low':
        return '#f3f4f6' // 淡灰
      default:
        return '#f3f4f6'
    }
  }

  // 根据重要程度返回字体颜色（与长期提醒事项一致）
  const getImportanceTextColor = (importance: 'low' | 'medium' | 'high') => {
    switch (importance) {
      case 'high': return '#991b1b'
      case 'medium': return '#9a3412'
      default: return '#1f2937'
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto relative"
      style={{ flex: 1 }}
      onDoubleClick={handleDoubleClick}
      onClick={closeContextMenu}
    >
      {unfinishedNotes.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 text-xs" style={{ height: '100%' }}>
          双击空白区域添加便签
        </div>
      ) : (
        <div className="space-y-1 p-0.5">
          {unfinishedNotes.map(note => (
            <div
              key={note.id}
              className="px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: getImportanceColor(note.importance),
                color: getImportanceTextColor(note.importance)
              }}
              onContextMenu={(e) => handleContextMenu(e, note)}
            >
              <div className="truncate">{note.title}</div>
            </div>
          ))}
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={handleEdit}
          >
            编辑
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={handleComplete}
          >
            标记完成
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
            onClick={handleDelete}
          >
            删除
          </button>
        </div>
      )}
    </div>
  )
}
