export interface CalendarEvent {
  id: string
  date: string
  time: string
  title: string
  location: string
  importance: 'high' | 'medium' | 'low'
  participants?: string[]
  description?: string
  
  // 飞书同步字段
  feishuEventId?: string      // 飞书日程 ID（用于判断创建还是更新）
  endTime?: string            // 结束时间（ISO 格式）
  lastSyncTime?: number       // 最后同步时间戳（用于冲突判断）
}

/**
 * 飞书日历信息接口
 */
export interface FeishuCalendar {
  calendar_id: string
  summary: string
  description?: string
  permissions?: 'private' | 'show_only_free_busy' | 'public'
  color?: number
  type?: string
  is_deleted?: boolean
  is_third_party?: boolean
  role?: 'owner' | 'writer' | 'reader'
  summary_alias?: string
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

/**
 * 应用设置接口
 */
export interface Settings {
  // 窗口设置
  windowOpacity: number
  windowWidth: number
  windowHeight: number
  windowX: number
  windowY: number
  
  // 背景颜色
  workdayColor: string
  weekendColor: string
  otherMonthColor: string
  
  // 日历文字设置
  calendarColor: string        // 日历文字颜色
  calendarFontSize: number     // 日历文字大小（px）
  calendarFontFamily: string   // 日历文字字体
  
  // 开机自启动设置
  autoLaunch?: boolean         // 是否开机自启动
  launchHidden?: boolean       // 自启动时是否隐藏窗口
}

/**
 * 附件类型
 */
export type AttachmentType = 'document' | 'image' | 'link' | 'other'

/**
 * 附件接口
 */
export interface Attachment {
  path: string
  name: string
  type: AttachmentType
}

/**
 * 导出事件接口
 */
export interface ExportEvent {
  id: string
  dateTime: {
    date: string
    startTime: string
    endTime: string
  }
  basicInfo: {
    title: string
    location?: string
    importance: 'high' | 'medium' | 'low'
  }
  content: {
    description: string
    attachments: Attachment[]
    rawDescription: string
  }
  syncInfo: {
    source: 'local' | 'feishu'
    feishuEventId?: string
  }
}

/**
 * 导出信息接口
 */
export interface ExportInfo {
  exportedAt: string
  dateRange: {
    start: string
    end: string
  }
  totalEvents: number
  withAttachments: number
  formatVersion: string
}

/**
 * 导出数据接口
 */
export interface ExportData {
  exportInfo: ExportInfo
  events: ExportEvent[]
}
