import { useState, useEffect } from 'react'
import { CalendarEvent } from '../types'

interface EventFormData {
  date: string
  time: string
  title: string
  location: string
  importance: 'high' | 'medium' | 'low'
}

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  initialDate: string
  editingEvent?: CalendarEvent | null
  syncToFeishu?: boolean  // 是否同步到飞书
}

export default function EventFormModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  editingEvent,
  syncToFeishu = false  // 默认不同步到飞书
}: EventFormModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<EventFormData>({
    date: initialDate,
    time: '',
    title: '',
    location: '',
    importance: 'medium'
  })
  const [errors, setErrors] = useState<{ time?: string; title?: string }>({})

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setFormData({
          date: editingEvent.date,
          time: editingEvent.time.replace(':', ''),
          title: editingEvent.title,
          location: editingEvent.location,
          importance: editingEvent.importance
        })
      } else {
        setFormData({
          date: initialDate,
          time: '',
          title: '',
          location: '',
          importance: 'medium'
        })
      }
      setErrors({})
      setTimeout(() => {
        const timeInput = document.getElementById('event-time') as HTMLInputElement
        if (timeInput) timeInput.focus()
      }, 100)
    }
  }, [isOpen, initialDate, editingEvent])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, formData])

  const handleTimeChange = (value: string): void => {
    let formattedTime = value.replace(/[^\d]/g, '')
    if (formattedTime.length > 4) formattedTime = formattedTime.slice(0, 4)
    setFormData(prev => ({ ...prev, time: formattedTime }))
    setErrors(prev => ({ ...prev, time: undefined }))
  }

  const formatTimeDisplay = (time: string): string => {
    if (!time) return ''
    // 如果是带冒号的格式，直接返回
    if (time.includes(':')) return time
    // 纯数字格式，需要格式化
    if (time.length === 1) return time  // 不补零，直接显示
    if (time.length === 2) return time
    if (time.length === 3) return `${time.slice(0, 1)}:${time.slice(1)}`
    if (time.length >= 4) return `${time.slice(0, 2)}:${time.slice(2, 4)}`
    return time
  }

  const formatTimeForSort = (time: string): string => {
    if (!time) return '0000'
    // 如果已经包含冒号，解析并格式化
    if (time.includes(':')) {
      const [h, m] = time.split(':')
      return `${(h || '0').padStart(2, '0')}${(m || '0').padStart(2, '0')}`
    }
    // 纯数字格式，补齐到 4 位
    const padded = time.padStart(4, '0')
    return padded.slice(0, 4)
  }

  const handleSubmit = (): void => {
    const newErrors: { time?: string; title?: string } = {}
    
    if (!formData.time) {
      newErrors.time = '请输入时间'
    } else if (formData.time.length < 3) {
      newErrors.time = '时间格式错误，请输入如 900 或 09:00'
    }
    
    if (!formData.title.trim()) {
      newErrors.title = '标题不能为空'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const timeValue = formatTimeForSort(formData.time)
    const timeStr = `${timeValue.slice(0, 2)}:${timeValue.slice(2, 4)}:00`
    
    // 计算开始和结束时间（使用本地时间）
    const [hours, minutes] = timeStr.split(':')
    const startDateTime = new Date(formData.date)
    startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    // 验证日期是否有效
    if (isNaN(startDateTime.getTime())) {
      console.error('无效的日期:', formData.date, timeStr)
      setErrors({ time: '日期或时间格式不正确' })
      return
    }
    
    const endDateTime = new Date(startDateTime.getTime() + 3600000) // +1 小时
    
    // ⭐ 保存为 ISO 字符串，但使用本地时区偏移
    // 飞书 API 需要本地时间戳，我们会在 sync 时转换
    const endTimeISO = endDateTime.toISOString()
    
    console.log('⏰ EventFormModal time calculation:', {
      date: formData.date,
      time: timeStr,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endTimeISO,
      timezone: 'Asia/Shanghai'
    })
    
    // 构建标题（包含优先级）
    let fullTitle = formData.title.trim()
    if (formData.importance === 'high') {
      fullTitle = `[高]${fullTitle}`
    } else if (formData.importance === 'low') {
      fullTitle = `[低]${fullTitle}`
    }

    const eventData: CalendarEvent = {
      id: editingEvent?.id || Date.now().toString(),
      date: formData.date,
      time: timeStr.slice(0, 5), // HH:mm
      title: fullTitle,
      location: formData.location,
      importance: formData.importance,
      documents: [],
      description: formData.description,
      // ⭐ 飞书同步相关字段：保留 feishuEventId 和 lastSyncTime
      feishuEventId: editingEvent?.feishuEventId,
      endTime: endTimeISO,
      lastSyncTime: editingEvent?.lastSyncTime
    }
    
    console.log('📝 Form submit:', {
      isEdit: !!editingEvent,
      hasFeishuId: !!eventData.feishuEventId,
      feishuId: eventData.feishuEventId,
      title: eventData.title,
      date: eventData.date,
      time: eventData.time
    })

    onSave(eventData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[450px] p-6">
        <h2 className="text-lg font-bold mb-4">
          {editingEvent ? '✏️ 编辑日程' : '➕ 创建日程'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              时间 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="event-time"
                type="text"
                value={formatTimeDisplay(formData.time)}
                onChange={(e) => handleTimeChange(e.target.value)}
                placeholder="如：900 或 09:00"
                className={`w-full px-3 py-2 border ${errors.time ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                autoFocus
              />
              {errors.time && (
                <p className="text-red-500 text-xs mt-1">{errors.time}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="日程标题"
              className={`w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
              {formData.date}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地点（可选）</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="会议室或线上"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重要度</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="importance"
                  checked={formData.importance === 'high'}
                  onChange={() => setFormData(prev => ({ ...prev, importance: 'high' }))}
                  className="mr-2"
                />
                <span className="text-red-500 font-medium">高</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="importance"
                  checked={formData.importance === 'medium'}
                  onChange={() => setFormData(prev => ({ ...prev, importance: 'medium' }))}
                  className="mr-2"
                />
                <span className="text-orange-500 font-medium">中</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="importance"
                  checked={formData.importance === 'low'}
                  onChange={() => setFormData(prev => ({ ...prev, importance: 'low' }))}
                  className="mr-2"
                />
                <span className="text-gray-500 font-medium">低</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
