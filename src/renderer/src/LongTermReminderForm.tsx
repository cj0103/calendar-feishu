import { useState, useEffect } from 'react'
import { LongTermReminder } from '../../types'

interface LongTermReminderFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (reminder: LongTermReminder) => void
  editingReminder: LongTermReminder | null
}

export function LongTermReminderForm({ isOpen, onClose, onSave, editingReminder }: LongTermReminderFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [importance, setImportance] = useState<'low' | 'medium' | 'high'>('low')

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title)
      setDescription(editingReminder.description || '')
      setImportance(editingReminder.importance)
    } else {
      setTitle('')
      setDescription('')
      setImportance('low')
    }
  }, [editingReminder, isOpen])

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('请输入提醒事项标题')
      return
    }

    onSave({
      id: editingReminder?.id || '',
      title: title.trim(),
      description: description.trim() || undefined,
      importance,
      createdAt: editingReminder?.createdAt || '',
      updatedAt: editingReminder?.updatedAt || ''
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">
            {editingReminder ? '编辑长期提醒事项' : '新增长期提醒事项'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入提醒事项标题"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              详细描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="输入详细描述（可选）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              重要程度
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setImportance('low')}
                className={`flex-1 py-2 text-sm rounded border ${
                  importance === 'low'
                    ? 'bg-gray-200 text-gray-800 border-gray-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                低
              </button>
              <button
                onClick={() => setImportance('medium')}
                className={`flex-1 py-2 text-sm rounded border ${
                  importance === 'medium'
                    ? 'bg-orange-200 text-orange-800 border-orange-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                中
              </button>
              <button
                onClick={() => setImportance('high')}
                className={`flex-1 py-2 text-sm rounded border ${
                  importance === 'high'
                    ? 'bg-red-200 text-red-800 border-red-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                高
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
