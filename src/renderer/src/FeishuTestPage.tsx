import { useState, useEffect } from 'react'
import { FeishuCalendar } from './types'

interface FeishuEvent {
  event_id: string
  summary: string
  start_time: {
    timestamp: string
    timezone: string
  }
  end_time: {
    timestamp: string
    timezone: string
  }
  location?: {
    name: string
    address?: string
  }
  description?: string
  updated_time: string
  create_time: string
  status: string
}

interface CreateCalendarFormData {
  summary: string
  description: string
  permissions: 'private' | 'show_only_free_busy' | 'public'
  color: number
  summaryAlias: string
}

export function FeishuTestPage(): JSX.Element {
  const [events, setEvents] = useState<FeishuEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [calendarId, setCalendarId] = useState('feishu.cn_ZNZmRH6zzbrOayVBy7Y3Ye@group.calendar.feishu.cn')
  
  // 日历管理相关状态
  const [calendars, setCalendars] = useState<FeishuCalendar[]>([])
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false)
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateCalendarFormData>({
    summary: '',
    description: '',
    permissions: 'private',
    color: -1,
    summaryAlias: ''
  })
  
  // ⭐ 时间段选择（默认：过去 3 个月 + 未来 2 周）
  const getDefaultDateRange = () => {
    const now = new Date()
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 3600000)
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 3600000)
    
    return {
      startDate: threeMonthsAgo.toISOString().split('T')[0],
      endDate: twoWeeksLater.toISOString().split('T')[0]
    }
  }
  
  const [startDate, setStartDate] = useState(getDefaultDateRange().startDate)
  const [endDate, setEndDate] = useState(getDefaultDateRange().endDate)

  // 加载日历列表
  const loadCalendars = async () => {
    setIsLoadingCalendars(true)
    setError(null)
    try {
      const result = await window.api.feishu.getCalendarList()
      if (result.success) {
        setCalendars(result.calendars || [])
        console.log('✅ 加载日历列表成功:', result.calendars?.length)
      } else {
        // 显示详细错误信息
        const errorMsg = result.error || '加载日历列表失败'
        const hint = result.hint ? `\n\n💡 ${result.hint}` : ''
        console.error('❌ 加载日历列表失败:', errorMsg)
        setError(errorMsg + hint)
      }
    } catch (err: any) {
      console.error('❌ 加载日历列表失败:', err)
      setError(`加载失败：${err.message || '未知错误'}\n\n💡 请检查：\n1. 飞书应用配置是否正确（App ID 和 App Secret）\n2. 应用是否已发布并启用\n3. 是否添加了日历相关权限`)
    } finally {
      setIsLoadingCalendars(false)
    }
  }

  // 创建日历
  const handleCreateCalendar = async () => {
    if (!createFormData.summary.trim()) {
      alert('请输入日历名称')
      return
    }

    setIsCreatingCalendar(true)
    try {
      const result = await window.api.feishu.createCalendar(createFormData)
      if (result.success) {
        alert(`日历创建成功！\n名称：${result.calendar.summary}\nID: ${result.calendar.calendar_id}`)
        // 清空表单
        setCreateFormData({
          summary: '',
          description: '',
          permissions: 'private',
          color: -1,
          summaryAlias: ''
        })
        // 刷新日历列表
        await loadCalendars()
      } else {
        alert('创建失败：' + result.error)
      }
    } catch (err: any) {
      console.error('❌ 创建日历失败:', err)
      alert('创建失败：' + err.message)
    } finally {
      setIsCreatingCalendar(false)
    }
  }

  // 复制日历 ID
  const copyCalendarId = async (calendarId: string) => {
    try {
      await navigator.clipboard.writeText(calendarId)
      alert('日历 ID 已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
      alert('复制失败，请手动复制')
    }
  }

  // 选择日历
  const selectCalendar = (selectedCalendarId: string) => {
    setCalendarId(selectedCalendarId)
    alert(`已选择日历：${selectedCalendarId}`)
  }

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 计算时间范围
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      
      console.log('📅 请求时间范围:', {
        startDate,
        endDate,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        startTimeStamp: Math.floor(start.getTime() / 1000),
        endTimeStamp: Math.floor(end.getTime() / 1000)
      })
      
      const result = await window.api.feishu.getEvents(
        calendarId,
        Math.floor(start.getTime() / 1000),
        Math.floor(end.getTime() / 1000)
      )
      
      console.log('📥 飞书 API 响应:', result)
      
      if (result.success) {
        // ⭐ 只显示 confirmed 状态的日程
        const confirmedEvents = (result.events || []).filter(e => e.status === 'confirmed')
        setEvents(confirmedEvents)
        console.log(`✅ 获取成功：${confirmedEvents.length} 个有效日程（已过滤 cancelled）`)
      } else {
        setError(result.error || '获取失败')
      }
    } catch (err: any) {
      console.error('❌ 获取失败:', err)
      setError(err.message || '未知错误')
    } finally {
      setLoading(false)
    }
  }
  
  // ⭐ 同步所有显示的日程到本地
  const syncToCalendar = async () => {
    if (events.length === 0) {
      alert('没有可同步的日程')
      return
    }
    
    const confirmed = confirm(`确定要同步 ${events.length} 个日程到本地日历吗？`)
    if (!confirmed) return
    
    try {
      // 直接处理，不依赖 SyncManager
      let successCount = 0
      let skipCount = 0
      
      // ⭐ 先加载本地事件
      const localEvents = JSON.parse(localStorage.getItem('calendar-events') || '[]')
      
      for (const feishuEvent of events) {
        // 转换为本地格式
        const startTime = new Date(parseInt(feishuEvent.start_time.timestamp) * 1000)
        const date = startTime.toISOString().split('T')[0]
        const time = startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
        
        // 检查本地是否已存在
        const exists = localEvents.find((e: any) => e.feishuEventId === feishuEvent.event_id)
        
        if (exists) {
          skipCount++
          console.log('⏭️ 跳过已存在日程:', feishuEvent.summary)
          continue
        }
        
        // 创建本地事件
        const newEvent = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          date,
          time,
          title: feishuEvent.summary,
          location: feishuEvent.location?.name || '',
          importance: 'medium' as const,
          description: feishuEvent.description || '',
          feishuEventId: feishuEvent.event_id,
          endTime: new Date(parseInt(feishuEvent.end_time.timestamp) * 1000).toISOString(),
          lastSyncTime: Date.now()
        }
        
        localEvents.push(newEvent)
        successCount++
        console.log('✅ 添加日程:', newEvent.title)
      }
      
      // 保存到 localStorage
      localStorage.setItem('calendar-events', JSON.stringify(localEvents))
      
      alert(`同步完成！\n新增：${successCount} 个\n跳过：${skipCount} 个\n总计：${localEvents.length} 个`)
      
      // 通知主应用重新加载
      window.location.reload()
    } catch (err: any) {
      console.error('❌ 同步失败:', err)
      alert('同步失败：' + err.message)
    }
  }
  
  // ⭐ 页面加载时自动加载日历列表
  useEffect(() => {
    loadCalendars()
  }, [])

  // ⭐ 重置为默认时间范围
  const resetDateRange = () => {
    const range = getDefaultDateRange()
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }

  const formatTimestamp = (timestamp: string | number) => {
    if (!timestamp) return '-'
    const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
    const date = new Date(ts * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-4">飞书日历管理中心</h1>
      
      {/* 日历管理区域 */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* 日历列表 */}
        <div className="p-4 bg-blue-50 rounded border border-blue-200">
          <h2 className="text-lg font-semibold mb-3">📅 我的日历</h2>
          
          {isLoadingCalendars ? (
            <div className="text-center py-4 text-gray-500">加载中...</div>
          ) : calendars.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              暂无日历，请创建新日历
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {calendars.map((calendar) => (
                <div
                  key={calendar.calendar_id}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    calendar.calendar_id === calendarId
                      ? 'bg-blue-100 border-blue-400 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => selectCalendar(calendar.calendar_id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {calendar.summary || '(无标题)'}
                        {calendar.calendar_id === calendarId && (
                          <span className="ml-2 text-xs text-blue-600">✓ 当前使用</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {calendar.calendar_id}
                      </div>
                      {calendar.role && (
                        <div className="text-xs text-gray-400 mt-1">
                          权限：{calendar.role === 'owner' ? '所有者' : calendar.role === 'writer' ? '编辑者' : '查看者'}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyCalendarId(calendar.calendar_id)
                      }}
                      className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      title="复制日历 ID"
                    >
                      📋 复制
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-3 flex gap-2">
            <button
              onClick={loadCalendars}
              disabled={isLoadingCalendars}
              className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              🔄 刷新列表
            </button>
          </div>
        </div>
        
        {/* 创建新日历 */}
        <div className="p-4 bg-green-50 rounded border border-green-200">
          <h2 className="text-lg font-semibold mb-3">➕ 创建新日历</h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">日历名称 *</label>
              <input
                type="text"
                value={createFormData.summary}
                onChange={(e) => setCreateFormData({ ...createFormData, summary: e.target.value })}
                placeholder="例如：工作日程、个人计划"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-green-300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">日历描述</label>
              <input
                type="text"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder="可选"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-green-300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">公开范围</label>
              <select
                value={createFormData.permissions}
                onChange={(e) => setCreateFormData({ ...createFormData, permissions: e.target.value as any })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-green-300"
              >
                <option value="private">私密（仅自己可见）</option>
                <option value="show_only_free_busy">仅展示忙闲信息</option>
                <option value="public">他人可查看日程详情</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCreateCalendar}
                disabled={isCreatingCalendar || !createFormData.summary.trim()}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {isCreatingCalendar ? '创建中...' : '✅ 创建日历'}
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              💡 提示：创建成功后会自动刷新日历列表，并提供 calendarId 用于配置
            </div>
          </div>
        </div>
      </div>
      
      {/* 日程获取与同步控制区域 */}
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">日历 ID:</label>
          <input
            type="text"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        {/* ⭐ 时间段选择 */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-sm font-medium mb-1">开始日期:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">结束日期:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        
        <div className="flex gap-2 mb-2">
          <button
            onClick={resetDateRange}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            📅 恢复默认（过去 3 个月 + 未来 2 周）
          </button>
        </div>
        
        {/* ⭐ 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? '获取中...' : '📖 获取飞书日程'}
          </button>
          
          <button
            onClick={() => {
              setEvents([])
              setError(null)
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            清空
          </button>
          
          <button
            onClick={syncToCalendar}
            disabled={events.length === 0}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            title="将获取到的日程同步到本地日历"
          >
            🔄 同步到日历
          </button>
        </div>
      </div>
      
      {/* 错误信息 */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>错误:</strong> {error}
        </div>
      )}
      
      {/* 统计信息 */}
      {events.length > 0 && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>成功获取 {events.length} 个日程</strong>
          <span className="ml-4">
            有效：{events.filter(e => e.status !== 'cancelled').length} 个 | 
            已取消：{events.filter(e => e.status === 'cancelled').length} 个
          </span>
        </div>
      )}
      
      {/* 日程列表 */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-2">日程列表</h2>
          
          <div className="mb-2 text-sm text-gray-600">
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked
                onChange={(e) => {
                  const table = e.target.closest('table')
                  if (table) {
                    table.style.display = e.target.checked ? 'table' : 'none'
                  }
                }}
                className="mr-2"
              />
              显示已取消的日程
            </label>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">Event ID</th>
                  <th className="border p-2 text-left">标题</th>
                  <th className="border p-2 text-left">开始时间</th>
                  <th className="border p-2 text-left">结束时间</th>
                  <th className="border p-2 text-left">地点</th>
                  <th className="border p-2 text-left">状态</th>
                  <th className="border p-2 text-left">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr 
                    key={event.event_id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${event.status === 'cancelled' ? 'opacity-50 bg-red-50' : ''}`}
                  >
                    <td className="border p-2 text-xs font-mono">
                      {event.event_id}
                    </td>
                    <td className="border p-2">
                      {event.summary || '(无标题)'}
                    </td>
                    <td className="border p-2 text-sm">
                      {formatTimestamp(event.start_time.timestamp)}
                    </td>
                    <td className="border p-2 text-sm">
                      {formatTimestamp(event.end_time.timestamp)}
                    </td>
                    <td className="border p-2 text-sm">
                      {event.location?.name || '-'}
                    </td>
                    <td className="border p-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.status === 'cancelled' ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="border p-2 text-xs">
                      {formatTimestamp(event.updated_time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* 调试信息 */}
      {events.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">调试信息</h3>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(events[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
