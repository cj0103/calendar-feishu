import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarEvent, CalendarDayInfo, Settings, LongTermReminder, Contact } from '../types'
import SettingsModal from './SettingsModal'
import ImportExportModal from './ImportExportModal'
import EventFormModal from './EventFormModal'
import { LongTermRemindersPanel } from './LongTermRemindersPanel'
import { ContactsModal } from './ContactsModal'
import { SyncManager, SyncStatus } from './sync/SyncManager'
import { FEISHU_CONFIG } from '../../main/feishuConfig'
import { FeishuTestPage } from './FeishuTestPage'
import { FeishuConfigWizard } from './components/FeishuConfigWizard'
import { applyOpacity } from './utils/colorUtils'
import { holidayManager, DayType } from './utils/holidayManager'
import { getLunarDateCached } from './utils/lunarUtils'

// 星期几的显示名称
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 获取星期几的中文名称
 * @param dateStr 日期字符串（YYYY-MM-DD）
 * @returns 星期几（如"星期日"）
 */
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const weekDaysFull = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekDaysFull[day]
}

/**
 * 获取农历日期字符串
 * @param dateStr 日期字符串（YYYY-MM-DD）
 * @returns 农历日期（如"正月初一"）
 */
function getLunarDate(dateStr: string): string {
  const date = new Date(dateStr)
  const lunarInfo = getLunarDateCached(date)
  return lunarInfo.lunarStr || ''
}

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
  // 是否需要配置飞书（首次启动）- 仅显示提示条，不再强制弹窗
  const [needsConfig, setNeedsConfig] = useState(false)
  // 是否显示配置向导（用户主动打开）
  const [showConfigWizard, setShowConfigWizard] = useState(false)
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
  // 飞书同步管理器（日历 ID 会在同步时动态获取）
  const [syncManager] = useState(() => new SyncManager())
  // 是否显示飞书测试页面
  const [showTestPage, setShowTestPage] = useState(false)
  // 配置管理 - 打开配置向导的函数
  const openConfigWizard = () => setShowConfigWizard(true)
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
  // 导入导出功能（统一弹窗）
  const [isImportExportOpen, setIsImportExportOpen] = useState(false)
  // 长期提醒事项
  const [longTermReminders, setLongTermReminders] = useState<LongTermReminder[]>([])
  // 通讯录
  const [contacts, setContacts] = useState<Contact[]>([])
  // 通讯录弹窗
  const [isContactsOpen, setIsContactsOpen] = useState(false)

  // 加载节假日数据（应用启动时）
  useEffect(() => {
    holidayManager.loadData().catch(err => {
      console.error('Failed to load holiday data:', err)
    })
    
    // 检查是否需要配置飞书
    const checkConfig = async () => {
      try {
        // 确保 window.api.feishu 存在
        if (!window.api?.feishu) {
          console.warn('window.api.feishu 不存在，跳过配置检查')
          return
        }
        
        const hasConfig = await window.api.feishu.hasConfig()
        console.log('飞书配置检查:', hasConfig ? '已配置' : '需要配置')
        if (!hasConfig) {
          setNeedsConfig(true)
        }
      } catch (error) {
        console.error('检查飞书配置失败:', error)
      }
    }
    
    checkConfig()
    
    // 监听配置需求通知（从主进程）
    if (window.api?.feishu?.onNeedsConfig) {
      const unsubscribe = window.api.feishu.onNeedsConfig(() => {
        console.log('收到配置需求通知')
        setNeedsConfig(true)
      })
      
      return () => {
        // 清理事件监听
        unsubscribe?.()
      }
    }
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

  // 加载长期提醒事项
  useEffect(() => {
    const savedReminders = localStorage.getItem('calendar-long-term-reminders')
    if (savedReminders) {
      try {
        const parsed = JSON.parse(savedReminders)
        setLongTermReminders(parsed)
      } catch (e) {
        console.error('加载长期提醒事项失败:', e)
      }
    }
  }, [])

  // 加载通讯录
  useEffect(() => {
    const savedContacts = localStorage.getItem('calendar-contacts')
    if (savedContacts) {
      try {
        const parsed = JSON.parse(savedContacts)
        setContacts(parsed)
      } catch (e) {
        console.error('加载通讯录失败:', e)
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
          calendarFontFamily: parsed.calendarFontFamily || 'inherit',
          // 导航栏设置
          headerTextColor: parsed.headerTextColor || '#1f2937',
          headerTextSize: parsed.headerTextSize ?? 18,
          headerTextFont: parsed.headerTextFont || 'inherit',
          navButtonColor: parsed.navButtonColor || '#374151',
          todayButtonColor: parsed.todayButtonColor || '#ffffff',
          todayButtonBgColor: parsed.todayButtonBgColor || '#2563eb',
          weekDayTextColor: parsed.weekDayTextColor || '#6b7280',
          weekDayTextSize: parsed.weekDayTextSize ?? 12
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

    // 2. 导入工具函数
    const { extractAttachments } = await import('./utils/exportUtils')

    // 3. 构建导出数据（精简格式）
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate
        },
        totalEvents: filteredEvents.length,
        withAttachments: filteredEvents.filter(e => e.description && (e.description.includes('\\') || e.description.includes('http'))).length,
        formatVersion: '2.1'
      },
      events: filteredEvents.map(event => {
        // 解析描述，分离文字和附件
        const { text, attachments } = extractAttachments(event.description || '')
        
        return {
          id: event.id,
          dateTime: {
            date: event.date,
            startTime: event.time,
            endTime: event.endTime || ''
          },
          basicInfo: {
            title: event.title,
            location: event.location,
            importance: event.importance
          },
          content: {
            description: text,
            attachments: attachments,
            rawDescription: event.description || ''
          },
          syncInfo: {
            source: event.feishuEventId ? 'feishu' : 'local',
            feishuEventId: event.feishuEventId
          }
        }
      })
    }

    // 4. 调用 IPC 保存文件
    const defaultFileName = `calendar-export-${startDate}-${endDate}.json`
    const result = await window.api.saveExportFile(exportData, defaultFileName)

    if (result.success) {
      alert(`导出成功！\n共导出 ${filteredEvents.length} 个日程\n包含 ${exportData.exportInfo.withAttachments} 个带附件的日程\n文件：${result.filePath}`)
    } else if (!result.canceled) {
      alert('导出失败：' + result.error)
    }
  }, [events])

  // 导入功能
  const handleImport = useCallback((newEvents: CalendarEvent[], syncToFeishu: boolean) => {
    // 合并现有日程和新日程
    const updatedEvents = [...events, ...newEvents]
    setEvents(updatedEvents)
    saveEventsToLocalStorage(updatedEvents)
    
    // 如果需要同步到飞书
    if (syncToFeishu) {
      newEvents.forEach(event => {
        setTimeout(() => {
          syncEventToFeishu(event, false)
        }, 0)
      })
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

  const saveLongTermReminders = (reminders: LongTermReminder[]) => {
    setLongTermReminders(reminders)
    try {
      localStorage.setItem('calendar-long-term-reminders', JSON.stringify(reminders))
    } catch (e) {
      console.error('保存长期提醒事项失败:', e)
    }
  }

  const saveContacts = (newContacts: Contact[]) => {
    setContacts(newContacts)
    try {
      localStorage.setItem('calendar-contacts', JSON.stringify(newContacts))
    } catch (e) {
      console.error('保存通讯录失败:', e)
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
    window.api?.hideWindow()
  }

  const handleMouseIgnore = (): void => {
    setMouseIgnore(!mouseIgnore)
  }

  const handleSync = async (): Promise<void> => {
    try {
      setSyncStatus(prev => ({ ...prev, syncing: true, error: null }))
      
      // 获取队列统计
      const queueStats = syncManager.getPendingQueueStats()
      if (queueStats.total > 0) {
        console.log(`📝 有待同步项目：${queueStats.total} 个（队列会自动处理）`)
      }
      
      // 执行增量同步（飞书 → 本地）
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
      
      // 显示同步结果
      const totalSynced = result.added + result.updated + result.uploaded
      if (totalSynced > 0) {
        console.log(`✅ 同步完成！新增 ${result.added}，更新 ${result.updated}，上传 ${result.uploaded}`)
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
  
  // 清空同步队列
  const handleClearQueue = (): void => {
    syncQueue.clear()
    console.log('✅ 同步队列已清空')
  }
  
  // 诊断功能：检查 localStorage 中事件的 feishuEventId 状态
  const handleDiagnose = (): void => {
    const events = syncManager.loadEventsFromLocalStorage()
    const withoutFeishuId = events.filter(e => !e.feishuEventId)
    const withFeishuId = events.filter(e => e.feishuEventId)
    
    console.log('📊 诊断结果:')
    console.log(`总事件数：${events.length}`)
    console.log(`有 feishuEventId: ${withFeishuId.length}`)
    console.log(`无 feishuEventId: ${withoutFeishuId.length}`)
    
    if (withoutFeishuId.length > 0) {
      console.log('⚠️ 以下事件没有 feishuEventId:')
      console.log(withoutFeishuId.map(e => ({ id: e.id, title: e.title, date: e.date })))
    }
    
    // 检查队列状态
    const queueStats = syncManager.getPendingQueueStats()
    console.log('📝 队列状态:', queueStats)
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
    const baseDate = calendarBaseDate
    
    const baseDateDayOfWeek = baseDate.getDay()
    const adjustedDayOfWeek = baseDateDayOfWeek === 0 ? 6 : baseDateDayOfWeek - 1
    
    const thisWeekMonday = new Date(baseDate)
    thisWeekMonday.setDate(baseDate.getDate() - adjustedDayOfWeek)
    
    const calendarStartDate = new Date(thisWeekMonday)
    calendarStartDate.setDate(thisWeekMonday.getDate() - 7)
    
    const days: CalendarDayInfo[] = []
    for (let i = 0; i < 28; i++) {
      const currentDay = new Date(calendarStartDate)
      currentDay.setDate(calendarStartDate.getDate() + i)
      const dayOfWeek = currentDay.getDay()

      const currentYear = currentDay.getFullYear()
      const currentMonth = String(currentDay.getMonth() + 1).padStart(2, '0')
      const currentDayStr = String(currentDay.getDate()).padStart(2, '0')
      const dateStr = `${currentYear}-${currentMonth}-${currentDayStr}`
      
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
      {/* 飞书配置提示条（仅当需要配置时显示，放在飞书日历管理中心按钮旁） */}
      {needsConfig && !showConfigWizard && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 pr-3 rounded shadow-lg flex items-center gap-2 whitespace-nowrap">
            <span className="text-yellow-700 text-xs">⚠️ 飞书配置未设置</span>
            <button
              onClick={() => setShowTestPage(true)}
              className="text-yellow-700 hover:text-yellow-900 text-xs underline"
            >
              去配置
            </button>
            <button
              onClick={() => setNeedsConfig(false)}
              className="text-yellow-500 hover:text-yellow-700 text-sm"
              title="关闭提示"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* 飞书配置向导（用户主动打开时显示） */}
      {showConfigWizard && (
        <FeishuConfigWizard 
          onComplete={() => {
            setShowConfigWizard(false)
            setNeedsConfig(false)
            // 配置完成后刷新页面
            window.location.reload()
          }}
          onClose={() => setShowConfigWizard(false)}
        />
      )}
      
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
            title="飞书日历管理中心"
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
            className={`w-6 h-6 flex items-center justify-center rounded relative ${
              syncStatus.syncing ? 'animate-spin bg-blue-200 text-blue-700' : 'hover:bg-green-100 text-green-600'
            }`}
            title={syncStatus.lastSyncTime ? `最后同步：${new Date(syncStatus.lastSyncTime).toLocaleString()}` : '点击同步飞书日历'}
          >
            {syncStatus.error ? '⚠️' : '🔄'}
            {/* 待同步数量徽章 */}
            {syncManager.getPendingQueueStats().total > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {syncManager.getPendingQueueStats().total}
              </span>
            )}
          </button>
          <button 
            onClick={handleSettings}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600"
            title="设置"
          >
            ⚙
          </button>
          <button 
            onClick={() => setIsImportExportOpen(true)}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-purple-600"
            title="导入/导出日程"
          >
            📁
          </button>
          <button 
            onClick={() => setIsContactsOpen(true)}
            className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded text-blue-600"
            title="通讯录"
          >
            📇
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrevMonth}
            className="px-3 py-1 rounded hover:bg-gray-100"
            style={{ color: settings.navButtonColor }}
          >
            ‹
          </button>
          <span
            style={{
              color: settings.headerTextColor,
              fontSize: `${settings.headerTextSize}px`,
              fontFamily: settings.headerTextFont,
              fontWeight: 'bold'
            }}
          >
            {calendarBaseDate.getFullYear()}年 {calendarBaseDate.getMonth() + 1}月
          </span>
          <button
            onClick={handleNextMonth}
            className="px-3 py-1 rounded hover:bg-gray-100"
            style={{ color: settings.navButtonColor }}
          >
            ›
          </button>
          <button
            onClick={handleToday}
            className="px-2 py-1 text-sm rounded ml-2"
            style={{
              color: settings.todayButtonColor,
              backgroundColor: settings.todayButtonBgColor
            }}
          >
            今
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center font-medium py-1"
              style={{
                color: settings.weekDayTextColor,
                fontSize: `${settings.weekDayTextSize}px`
              }}
            >
              周{day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 min-h-[560px] auto-rows-fr">
          {calendarDays.map((dayInfo, index) => {
            const dayEvents = getEventsForDay(dayInfo.date)
            const isToday = dayInfo.date === getTodayDateStr()
            
            // 检查节假日类型
            const dayType: DayType = holidayManager.checkDate(dayInfo.date)
            
            // 应用透明度到背景色（优先级：调休工作日 > 法定节假日 > 周末 > 工作日）
            let backgroundColor = 'transparent'
            let dayMark: string | null = null
            
            if (dayType.isWorkday) {
              backgroundColor = applyOpacity(settings.workdayColor, settings.windowOpacity)
              dayMark = '班'
            } else if (dayType.isHoliday) {
              backgroundColor = applyOpacity(settings.weekendColor, settings.windowOpacity)
              dayMark = '休'
            } else if (dayInfo.isWeekend) {
              backgroundColor = applyOpacity(settings.weekendColor, settings.windowOpacity)
            } else if (!dayInfo.isCurrentMonth) {
              backgroundColor = applyOpacity(settings.otherMonthColor, settings.windowOpacity)
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
                      className={`text-xs p-1 rounded cursor-pointer break-words leading-tight ${
                        event.importance === 'high' ? 'bg-red-200 text-red-800' :
                        event.importance === 'medium' ? 'bg-orange-200 text-orange-800' :
                        'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {event.time} {event.title}{event.location ? `（${event.location}）` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <LongTermRemindersPanel
          reminders={longTermReminders}
          onSaveReminders={saveLongTermReminders}
          settings={settings}
        />
      </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImport={handleImport}
        onExport={handleExport}
        existingEvents={events}
        totalEvents={events.length}
      />

      <EventFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleEventSave}
        initialDate={selectedDate}
        editingEvent={editingEvent}
      />

      <ContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        contacts={contacts}
        onSaveContacts={saveContacts}
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
              <FeishuTestPage onOpenConfig={openConfigWizard} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
