import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarEvent, CalendarDayInfo, Settings } from '../types'
import SettingsModal from './SettingsModal'
import ExportModal from './ExportModal'
import EventFormModal from './EventFormModal'
import { SyncManager, SyncStatus } from './sync/SyncManager'
import { FEISHU_CONFIG } from '../../main/feishuConfig'
import { FeishuTestPage } from './FeishuTestPage'
import { applyOpacity } from './utils/colorUtils'
import { holidayManager, DayType } from './utils/holidayManager'
import { getLunarDateCached } from './utils/lunarUtils'

// 星期几的显示名称
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

/** 日历日期信息接口 */
interface CalendarDayInfo {
  date: string
  day: number | null
  isCurrentMonth: boolean
  isPrevMonth: boolean
  isNextMonth: boolean
  isWeekend: boolean
  /** 农历字符串（如"正月初一"） */
  lunarStr?: string
}

/**
 * 桌面日历应用主组件
 * 功能包括：日历显示、日程管理、飞书日历同步、节假日显示、窗口设置等
 */
function App(): JSX.Element {
  const today = new Date()
  // 日历基准日期（用于计算日历显示范围）
  const [calendarBaseDate, setCalendarBaseDate] = useState(new Date())
  // 本地日程列表
  const [events, setEvents] = useState<CalendarEvent[]>([])
  // 鼠标悬停的日程
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  // 鼠标位置（用于显示悬停日程详情）
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  // 日程表单是否打开
  const [isFormOpen, setIsFormOpen] = useState(false)
  // 选中的日期（用于新建日程）
  const [selectedDate, setSelectedDate] = useState('')
  // 右键菜单
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: CalendarEvent } | null>(null)
  // 正在编辑的日程
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  // 设置对话框是否打开
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 鼠标穿透模式
  const [mouseIgnore, setMouseIgnore] = useState(false)
  // 飞书同步状态
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ syncing: false, lastSyncTime: null, error: null })
  // 飞书同步管理器（使用配置的日历 ID）
  const [syncManager] = useState(() => new SyncManager(FEISHU_CONFIG.calendarId))
  // 是否显示飞书测试页面
  const [showTestPage, setShowTestPage] = useState(false)
  // 窗口设置（透明度、大小、位置、颜色等）
  const [settings, setSettings] = useState<Settings>({
    windowOpacity: 100,
    windowWidth: 1200,
    windowHeight: 800,
    windowX: 100,
    windowY: 100,
    workdayColor: '#eff6ff',
    weekendColor: '#fef2f2',
    otherMonthColor: '#f3f4f6',
    calendarColor: '#1f2937',
    calendarFontSize: 14,
    calendarFontFamily: 'inherit'
  })
  // 导出功能
  const [isExportOpen, setIsExportOpen] = useState(false)

  // 加载节假日数据（应用启动时）
  useEffect(() => {
    holidayManager.loadData().catch(err => {
      console.error('Failed to load holiday data:', err)
    })
  }, [])

  // 加载本地存储的日程信息
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendar-events')
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents)
        setEvents(parsed)
      } catch (e) {
        console.error('加载日程信息失败:', e)
      }
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('calendar-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings({
          windowOpacity: parsed.windowOpacity ?? 100,
          windowWidth: parsed.windowWidth ?? 1200,
          windowHeight: parsed.windowHeight ?? 700,
          windowX: parsed.windowX ?? 100,
          windowY: parsed.windowY ?? 100,
          workdayColor: parsed.workdayColor || '#eff6ff',
          weekendColor: parsed.weekendColor || '#fef2f2',
          otherMonthColor: parsed.otherMonthColor || '#f3f4f6',
          calendarColor: parsed.calendarColor || '#1f2937',
          calendarFontSize: parsed.calendarFontSize ?? 14,
          calendarFontFamily: parsed.calendarFontFamily || 'inherit'
        })
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
    
    // 监听窗口移动并保存
    const handleMove = (x: number, y: number): void => {
      setSettings(prev => {
        const newSettings = {
          ...prev,
          windowX: x,
          windowY: y
        }
        localStorage.setItem('calendar-settings', JSON.stringify(newSettings))
        
        // 同时保存到配置文件
        window.api?.getBounds().then(bounds => {
          window.api?.savePosition({
            x,
            y,
            width: bounds.width,
            height: bounds.height
          })
        })
        
        return newSettings
      })
    }
    
    // 监听窗口大小变化并保存
    const handleResize = (width: number, height: number): void => {
      setSettings(prev => {
        const newSettings = {
          ...prev,
          windowWidth: width,
          windowHeight: height
        }
        localStorage.setItem('calendar-settings', JSON.stringify(newSettings))
        
        // 同时保存到配置文件
        window.api?.savePosition({
          x: prev.windowX,
          y: prev.windowY,
          width,
          height
        })
        
        return newSettings
      })
    }
    
    const cleanupMove = window.api?.onWindowMoved(handleMove)
    const cleanupResize = window.api?.onWindowResized(handleResize)
    
    return () => {
      // 清理监听器，防止内存泄漏
      cleanupMove?.()
      cleanupResize?.()
    }
  }, [])

  const handleSaveSettings = (newSettings: Settings): void => {
    setSettings(newSettings)
    localStorage.setItem('calendar-settings', JSON.stringify(newSettings))
    // 透明度现在通过 CSS 控制，不需要调用 Electron API
  }

  // 导出功能
  const handleExport = useCallback(async (startDate: string, endDate: string) => {
    // 1. 筛选日期范围内的日程
    const filteredEvents = events.filter(event => {
      const eventDate = event.date
      return eventDate >= startDate && eventDate <= endDate
    })

    // 2. 构建导出数据（简化结构，适合大模型分析）
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate
        },
        totalEvents: filteredEvents.length
      },
      events: filteredEvents.map(event => ({
        date: event.date,
        time: event.time,
        title: event.title,
        location: event.location,
        importance: event.importance,
        description: event.description || ''
      })),
      statistics: {
        byImportance: {
          high: filteredEvents.filter(e => e.importance === 'high').length,
          medium: filteredEvents.filter(e => e.importance === 'medium').length,
          low: filteredEvents.filter(e => e.importance === 'low').length
        },
        byMonth: filteredEvents.reduce((acc, event) => {
          const month = event.date.substring(0, 7) // "YYYY-MM"
          acc[month] = (acc[month] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // 3. 调用 IPC 保存文件
    const defaultFileName = `calendar-export-${startDate}-${endDate}.json`
    const result = await window.api.saveExportFile(exportData, defaultFileName)

    if (result.success) {
      alert(`导出成功！\n共导出 ${filteredEvents.length} 个日程\n文件：${result.filePath}`)
      setIsExportOpen(false)
    } else if (!result.canceled) {
      alert('导出失败：' + result.error)
    }
  }, [events])

  // 保存日程到本地存储
  const saveEventsToLocalStorage = (eventsToSave: CalendarEvent[]) => {
    try {
      localStorage.setItem('calendar-events', JSON.stringify(eventsToSave))
    } catch (e) {
      console.error('保存日程信息失败:', e)
    }
  }

  // 同步单个事件到飞书（异步，不阻塞主流程）
  const syncEventToFeishu = async (event: CalendarEvent, isUpdate: boolean = false) => {
    try {
      // 解析开始和结束时间（使用本地时间）
      const [hours, minutes] = event.time.split(':')
      const startDateTime = new Date(event.date)
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const endDateTime = event.endTime ? new Date(event.endTime) : new Date(startDateTime.getTime() + 3600000)
      
      const eventData: any = {
        summary: event.title,
        description: event.description || '',
        start_time: {
          timestamp: Math.floor(startDateTime.getTime() / 1000).toString(),
          timezone: 'Asia/Shanghai'
        },
        end_time: {
          timestamp: Math.floor(endDateTime.getTime() / 1000).toString(),
          timezone: 'Asia/Shanghai'
        },
        need_notification: true,
        visibility: 'default'
      }
      
      // 添加 location 字段（使用对象格式）
      if (event.location && event.location.trim()) {
        eventData.location = {
          name: event.location.trim()
        }
      }

      const calendarId = 'feishu.cn_ZNZmRH6zzbrOayVBy7Y3Ye@group.calendar.feishu.cn'
      let result
      
      if (isUpdate && event.feishuEventId) {
        // 更新飞书事件
        result = await window.api.feishu.updateEvent(calendarId, event.feishuEventId, eventData)
      } else {
        // 创建飞书事件
        result = await window.api.feishu.createEvent(calendarId, eventData)
      }

      if (result.success) {
        // 更新本地事件的飞书 ID（不阻塞保存）
        setEvents(prevEvents => {
          const updatedEvents = prevEvents.map(e => {
            if (e.id === event.id) {
              return { ...e, feishuEventId: result.event.event_id }
            }
            return e
          })
          saveEventsToLocalStorage(updatedEvents)
          return updatedEvents
        })
      } else {
        console.error('飞书同步失败:', result.error)
      }
    } catch (error) {
      console.error('同步到飞书失败:', error)
    }
  }

  // 使用 useMemo 实现节流鼠标移动监听（100ms）
  const handleMouseMove = useMemo(() => {
    let lastCall = 0
    return (e: React.MouseEvent<HTMLDivElement>) => {
      const now = Date.now()
      if (now - lastCall >= 100) {
        lastCall = now
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      }
    }
  }, [])

  const handleSettings = (): void => {
    setSettingsOpen(true)
  }

  const handleMinimize = (): void => {
    window.api?.minimize()
  }

  const handleMouseIgnore = (): void => {
    setMouseIgnore(!mouseIgnore)
  }

  const handleSync = async (): Promise<void> => {
    try {
      setSyncStatus(prev => ({ ...prev, syncing: true, error: null }))
      const result = await syncManager.sync()
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        lastSyncTime: Date.now()
      }))
      // 重新加载本地事件
      const savedEvents = localStorage.getItem('calendar-events')
      if (savedEvents) {
        setEvents(JSON.parse(savedEvents))
      }
    } catch (error: any) {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: error.message || '同步失败'
      }))
      console.error('同步失败:', error)
    }
  }

  // 获取今天的日期字符串（本地时间）
  const getTodayDateStr = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 月份切换处理函数
  const handlePrevMonth = () => {
    const newBaseDate = new Date(calendarBaseDate)
    newBaseDate.setMonth(newBaseDate.getMonth() - 1)
    setCalendarBaseDate(newBaseDate)
  }

  const handleNextMonth = () => {
    const newBaseDate = new Date(calendarBaseDate)
    newBaseDate.setMonth(newBaseDate.getMonth() + 1)
    setCalendarBaseDate(newBaseDate)
  }

  const handleToday = () => {
    setCalendarBaseDate(new Date())
  }

  const getCalendarDays = (year: number, month: number): CalendarDayInfo[] => {
    // 使用 calendarBaseDate 计算日历显示范围
    const baseDate = calendarBaseDate
    
    // 1. 计算 baseDate 所在的周的周一
    const baseDateDayOfWeek = baseDate.getDay()
    const adjustedDayOfWeek = baseDateDayOfWeek === 0 ? 6 : baseDateDayOfWeek - 1
    
    // 2. baseDate 所在周的周一
    const thisWeekMonday = new Date(baseDate)
    thisWeekMonday.setDate(baseDate.getDate() - adjustedDayOfWeek)
    
    // 3. 上周的周一（日历起始日期）
    const calendarStartDate = new Date(thisWeekMonday)
    calendarStartDate.setDate(thisWeekMonday.getDate() - 7)
    
    // 4. 生成 35 天（5 周）
    const days: CalendarDayInfo[] = []
    for (let i = 0; i < 35; i++) {
      const currentDay = new Date(calendarStartDate)
      currentDay.setDate(calendarStartDate.getDate() + i)
      const dayOfWeek = currentDay.getDay()

      // 修复时区问题：使用本地时间格式化，而不是 toISOString()
      const currentYear = currentDay.getFullYear()
      const currentMonth = String(currentDay.getMonth() + 1).padStart(2, '0')
      const currentDayStr = String(currentDay.getDate()).padStart(2, '0')
      const dateStr = `${currentYear}-${currentMonth}-${currentDayStr}`
      
      // 获取农历信息
      const lunarInfo = getLunarDateCached(currentDay)

      days.push({
        date: dateStr,
        day: currentDay.getDate(),
        isCurrentMonth: currentDay.getMonth() === month,
        isPrevMonth: currentDay.getMonth() < month && (month !== 0 || currentDay.getMonth() !== 11),
        isNextMonth: currentDay.getMonth() > month && (month !== 11 || currentDay.getMonth() !== 0),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        lunarStr: lunarInfo.lunarStr
      })
    }

    return days
  }

  const formatTimeForSort = (time: string): string => {
    if (!time) return '0000'
    let formatted = time
    if (time.length <= 2) formatted = time
    else if (time.length === 3) formatted = `${time.slice(0, 1)}:${time.slice(1)}`
    else if (time.length >= 4) formatted = `${time.slice(0, 2)}:${time.slice(2, 4)}`
    const [h, m] = formatted.split(':')
    return `${(h || '0').padStart(2, '0')}${(m || '0').padStart(2, '0')}`
  }

  // 使用 useMemo 缓存按日期分组的日程
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach(event => {
      if (!map.has(event.date)) {
        map.set(event.date, [])
      }
      map.get(event.date)!.push(event)
    })
    // 排序
    map.forEach(eventsList => {
      eventsList.sort((a, b) => {
        const timeA = formatTimeForSort(a.time)
        const timeB = formatTimeForSort(b.time)
        return timeA.localeCompare(timeB)
      })
    })
    return map
  }, [events])

  const getEventsForDay = (date: string): CalendarEvent[] => {
    return eventsByDate.get(date) || []
  }

  const handleDayDoubleClick = (date: string): void => {
    setSelectedDate(date)
    setEditingEvent(null)
    setIsFormOpen(true)
  }

  const handleEventSave = (eventData: CalendarEvent): void => {
    const isEditMode = !!editingEvent
    
    if (isEditMode) {
      // ⭐ 编辑模式：更新本地数据
      const updated = events.map(event =>
        event.id === eventData.id ? eventData : event
      )
      setEvents(updated)
      saveEventsToLocalStorage(updated)
      
      // ⭐ 关键判断：根据 feishuEventId 决定创建还是更新
      if (eventData.feishuEventId) {
        // 已有飞书 ID → 更新飞书日程
        setTimeout(() => {
          syncManager.syncUpdateToFeishu(eventData)
            .then(success => {
              // 静默处理，不输出日志
            })
        }, 0)
      } else {
        // 无飞书 ID → 创建飞书日程
        setTimeout(() => {
          syncManager.syncCreateToFeishu(eventData)
            .then(success => {
              // 静默处理，不输出日志
            })
        }, 0)
      }
    } else {
      // ⭐ 新建模式：创建本地数据和飞书日程
      const newEvent: CalendarEvent = {
        ...eventData,
        id: Date.now().toString()
      }
      
      const updated = [...events, newEvent]
      setEvents(updated)
      saveEventsToLocalStorage(updated)
      
      // 异步创建到飞书
      setTimeout(() => {
        syncManager.syncCreateToFeishu(newEvent)
          .then(success => {
            // 静默处理，不输出日志
          })
      }, 0)
    }
    
    // 关闭表单
    setIsFormOpen(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = (eventId: string): void => {
    const event = events.find(e => e.id === eventId)
    
    if (event) {
      // ⭐ 如果有飞书 ID，同步删除飞书日程
      if (event.feishuEventId) {
        setTimeout(() => {
          syncManager.syncDeleteFromFeishu(event)
            .then(success => {
              // 静默处理，不输出日志
            })
        }, 0)
      }
    }
    
    // 删除本地数据
    const updated = events.filter(e => e.id !== eventId)
    setEvents(updated)
    saveEventsToLocalStorage(updated)
    setContextMenu(null)
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent): void => {
    e.stopPropagation()
    setEditingEvent(event)
    setSelectedDate(event.date)
    setIsFormOpen(true)
    setContextMenu(null)
  }

  // 使用 useMemo 缓存日历计算结果
  const calendarDays = useMemo(() => {
    return getCalendarDays(calendarBaseDate.getFullYear(), calendarBaseDate.getMonth())
  }, [calendarBaseDate])

  return (
    <div 
      className="flex flex-col relative"
      style={{ 
        width: settings.windowWidth, 
        height: settings.windowHeight
      }}
      onMouseMove={handleMouseMove}
    >
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'transparent',
          pointerEvents: mouseIgnore ? 'none' : 'auto',
          zIndex: 0
        }}
      />
      
      <div className="flex-1 flex flex-col relative" style={{ zIndex: 1, pointerEvents: mouseIgnore ? 'none' : 'auto' }}>
      <div 
        className="h-8 flex items-center justify-between px-3 drag-region"
        style={{ 
          pointerEvents: 'auto',
          backgroundColor: applyOpacity('#f3f4f6', settings.windowOpacity)
        }}
      >
        <span className="text-xs text-gray-500">桌面日历</span>
        <div className="flex items-center gap-1 no-drag">
          <button 
            onClick={() => setShowTestPage(!showTestPage)}
            className={`w-6 h-6 flex items-center justify-center rounded ${
              showTestPage ? 'bg-purple-200 text-purple-700' : 'hover:bg-purple-100 text-purple-600'
            }`}
            title="飞书日程测试页面"
          >
            🧪
          </button>
          <button 
            onClick={handleMouseIgnore}
            className={`w-6 h-6 flex items-center justify-center rounded ${
              mouseIgnore ? 'bg-green-200 text-green-700' : 'hover:bg-gray-200 text-gray-600'
            }`}
            title={mouseIgnore ? '鼠标穿透已开启（点击桌面关闭）' : '鼠标穿透'}
          >
            🖱️
          </button>
          <button 
            onClick={handleSync}
            className={`w-6 h-6 flex items-center justify-center rounded ${
              syncStatus.syncing ? 'animate-spin bg-blue-200 text-blue-700' : 'hover:bg-green-100 text-green-600'
            }`}
            title={syncStatus.lastSyncTime ? `最后同步：${new Date(syncStatus.lastSyncTime).toLocaleString()}` : '点击同步飞书日历'}
          >
            {syncStatus.error ? '⚠️' : '🔄'}
          </button>
          <button 
            onClick={handleSettings}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
            title="设置"
          >
            ⚙
          </button>
          <button 
            onClick={() => setIsExportOpen(true)}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-green-600"
            title="导出日程"
          >
            📤
          </button>
          <button 
            onClick={handleMinimize}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
            title="最小化"
          >
            ─
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrevMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            ‹
          </button>
          <span className="text-lg font-bold">
            {calendarBaseDate.getFullYear()}年 {calendarBaseDate.getMonth() + 1}月
          </span>
          <button
            onClick={handleNextMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            ›
          </button>
          <button
            onClick={handleToday}
            className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded ml-2"
          >
            今
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              周{day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 min-h-[500px] auto-rows-fr">
          {calendarDays.map((dayInfo, index) => {
            const dayEvents = getEventsForDay(dayInfo.date)
            const isToday = dayInfo.date === getTodayDateStr()
            
            // 检查节假日类型
            const dayType: DayType = holidayManager.checkDate(dayInfo.date)
            
            // 应用透明度到背景色（优先级：调休工作日 > 法定节假日 > 周末 > 工作日）
            let backgroundColor = 'transparent'
            let dayMark: string | null = null
            
            if (dayType.isWorkday) {
              // 调休工作日（周末但要上班）- 使用工作日背景
              backgroundColor = applyOpacity(settings.workdayColor, settings.windowOpacity)
              dayMark = '班'
            } else if (dayType.isHoliday) {
              // 法定节假日（工作日但要休息）- 使用周末背景
              backgroundColor = applyOpacity(settings.weekendColor, settings.windowOpacity)
              dayMark = '休'
            } else if (!dayInfo.isCurrentMonth) {
              backgroundColor = applyOpacity(settings.otherMonthColor, settings.windowOpacity)
            } else if (dayInfo.isWeekend) {
              backgroundColor = applyOpacity(settings.weekendColor, settings.windowOpacity)
            } else {
              backgroundColor = applyOpacity(settings.workdayColor, settings.windowOpacity)
            }

            return (
              <div
                key={index}
                className={`border rounded p-0.5 flex flex-col relative ${
                  isToday ? 'border-2 border-red-500' : 'border-gray-200'
                }`}
                style={{ backgroundColor }}
                onDoubleClick={() => handleDayDoubleClick(dayInfo.date)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (dayEvents.length > 0) {
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      event: dayEvents[0]
                    })
                  }
                }}
              >
                <div className="relative mb-0.5 flex items-center justify-center shrink-0">
                  <div 
                    className="flex items-center"
                    style={{
                      color: settings.calendarColor,
                      fontSize: `${settings.calendarFontSize}px`,
                      fontFamily: settings.calendarFontFamily
                    }}
                  >
                    <span>{dayInfo.day}</span>
                    {/* 农历显示 */}
                    {dayInfo.lunarStr && (
                      <span className="ml-1">
                        {dayInfo.lunarStr}
                      </span>
                    )}
                  </div>
                  {/* 节假日标记 */}
                  {dayMark && (
                    <span className="absolute -right-1 -top-1 text-[10px] font-bold bg-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
                      style={{ color: dayMark === '班' ? '#16a34a' : '#dc2626' }}>
                      {dayMark}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 min-h-[120px]">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(event, e)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setContextMenu({ x: e.clientX, y: e.clientY, event })
                      }}
                      onMouseEnter={(e) => {
                        if (event.description) {
                          setHoveredEvent(event)
                          setMousePosition({ x: e.clientX, y: e.clientY })
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredEvent(null)
                      }}
                      onMouseMove={(e) => {
                        if (hoveredEvent) {
                          setMousePosition({ x: e.clientX, y: e.clientY })
                        }
                      }}
                      className={`text-xs p-0.5 rounded cursor-pointer truncate leading-tight ${
                        event.importance === 'high' ? 'bg-red-200 text-red-800' :
                        event.importance === 'medium' ? 'bg-orange-200 text-orange-800' :
                        'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {event.time} {event.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        totalEvents={events.length}
      />

      <EventFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleEventSave}
        initialDate={selectedDate}
        editingEvent={editingEvent}
      />

      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => handleEventClick(contextMenu.event, new MouseEvent('click') as any)}
          >
            ✏️ 编辑日程
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-100"
            onClick={() => handleDeleteEvent(contextMenu.event.id)}
          >
            🗑️ 删除日程
          </button>
        </div>
      )}
      
      {/* 日程备注悬浮框 */}
      {hoveredEvent && (
        <div
          className="fixed bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-2xl p-3 z-50 max-w-xs"
          style={{
            left: Math.min(mousePosition.x + 15, window.innerWidth - 320),
            top: Math.min(mousePosition.y + 15, window.innerHeight - 200)
          }}
        >
          <div className="text-sm font-medium text-gray-800 mb-2 pb-2 border-b border-gray-200">
            📝 备注信息
          </div>
          <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
            {hoveredEvent.description}
          </div>
        </div>
      )}
      
      {/* 飞书日程测试页面 */}
      {showTestPage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto">
          <div className="min-h-screen py-8">
            <div className="relative bg-white m-4 rounded shadow-lg">
              <button
                onClick={() => setShowTestPage(false)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600 z-10"
              >
                ✕
              </button>
              <FeishuTestPage />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
