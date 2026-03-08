export interface CalendarEvent {
  id: string
  date: string
  time: string
  title: string
  location: string
  importance: 'high' | 'medium' | 'low'
  documents: string[]
  participants?: string[]
  description?: string
  
  // 飞书同步字段
  feishuEventId?: string      // 飞书日程 ID（用于判断创建还是更新）
  endTime?: string            // 结束时间（ISO 格式）
  lastSyncTime?: number       // 最后同步时间戳（用于冲突判断）
}

export interface CalendarDay {
  date: string
  day: number
  events: CalendarEvent[]
  isToday: boolean
  isCurrentMonth: boolean
}

export interface CalendarDayInfo {
  date: string
  day: number | null
  isCurrentMonth: boolean
  isPrevMonth: boolean
  isNextMonth: boolean
  isWeekend: boolean
}

export interface AppConfig {
  appId: string
  appSecret: string
  selectedCalendars: string[]
  syncInterval: number
  displaySettings: {
    showWeekNumber: boolean
    firstDayOfWeek: number
    eventCountPerDay: number
  }
}

export interface SyncQueue {
  id: number
  eventId: string
  operation: 'create' | 'update' | 'delete'
  payload: CalendarEvent
  createdAt: string
  status: 'pending' | 'syncing' | 'synced' | 'failed'
}
