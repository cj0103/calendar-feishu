import { useState, useEffect } from 'react'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (startDate: string, endDate: string) => void
  totalEvents: number
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  totalEvents
}: ExportModalProps): JSX.Element | null {
  const today = new Date()
  const [startDate, setStartDate] = useState(
    new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0]
  )
  const [stats, setStats] = useState({ days: 0, events: 0 })

  useEffect(() => {
    if (isOpen) {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      // 简单估算
      const eventsInRange = Math.floor(totalEvents * (days / 365))
      setStats({ days, events: eventsInRange })
    }
  }, [isOpen, startDate, endDate, totalEvents])

  const handleExport = () => {
    if (new Date(startDate) > new Date(endDate)) {
      alert('开始日期不能晚于结束日期')
      return
    }
    onExport(startDate, endDate)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[450px] p-6">
        <h2 className="text-lg font-bold mb-4">导出日程数据</h2>
        
        <div className="space-y-4">
          {/* 日期范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              导出日期范围
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* 统计信息 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              共选择 <span className="font-medium text-gray-900">{stats.days}</span> 天，
              包含约 <span className="font-medium text-gray-900">{stats.events}</span> 个日程
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
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  )
}
