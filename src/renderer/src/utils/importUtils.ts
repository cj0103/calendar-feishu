import { CalendarEvent, ExportEvent } from '../types'

/**
 * 数据验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  events?: ExportEvent[]
  totalEvents?: number
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  hasConflicts: boolean
  conflicts: Array<{
    newEvent: CalendarEvent
    existingEvent: CalendarEvent
  }>
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  warnings: string[]
}

/**
 * 验证导入数据
 * @param data 要验证的数据
 * @returns 验证结果
 */
export function validateImportData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let events: ExportEvent[] = []
  
  // 检查数据是否为空
  if (!data) {
    return {
      valid: false,
      errors: ['文件内容为空'],
      warnings: []
    }
  }
  
  // 判断数据格式
  if (Array.isArray(data)) {
    // 格式 2/3：数组格式
    if (data.length === 0) {
      return {
        valid: false,
        errors: ['文件中没有任何日程数据'],
        warnings: []
      }
    }
    
    // 验证每个事件
    for (let i = 0; i < data.length; i++) {
      const event = data[i]
      const eventErrors = validateEvent(event, i + 1)
      errors.push(...eventErrors.errors)
      warnings.push(...eventErrors.warnings)
    }
    
    if (errors.length === 0) {
      // 转换为统一格式
      events = data.map(e => convertToExportFormat(e))
    }
  } else if (typeof data === 'object') {
    // 格式 1：完整格式
    if (!data.events || !Array.isArray(data.events)) {
      return {
        valid: false,
        errors: ['无效的文件格式：缺少 events 字段'],
        warnings: []
      }
    }
    
    if (data.events.length === 0) {
      return {
        valid: false,
        errors: ['文件中没有任何日程数据'],
        warnings: []
      }
    }
    
    // 验证每个事件
    for (let i = 0; i < data.events.length; i++) {
      const event = data.events[i]
      const eventErrors = validateEvent(event, i + 1)
      errors.push(...eventErrors.errors)
      warnings.push(...eventErrors.warnings)
    }
    
    if (errors.length === 0) {
      events = data.events.map(e => convertToExportFormat(e))
    }
  } else {
    return {
      valid: false,
      errors: ['无效的文件格式：必须是数组或对象'],
      warnings: []
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    events: errors.length === 0 ? events : undefined,
    totalEvents: events.length
  }
}

/**
 * 验证单个事件
 */
function validateEvent(event: any, index: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 检查必填字段：date
  if (!event.date && !event.dateTime?.date) {
    errors.push(`第 ${index} 个日程缺少必填字段：date（日期）`)
  } else if (event.date && !isValidDate(event.date)) {
    errors.push(`第 ${index} 个日程的日期格式错误：${event.date}，应为 YYYY-MM-DD 格式`)
  } else if (event.dateTime?.date && !isValidDate(event.dateTime.date)) {
    errors.push(`第 ${index} 个日程的日期格式错误：${event.dateTime.date}，应为 YYYY-MM-DD 格式`)
  }
  
  // 检查必填字段：title
  if (!event.title && !event.basicInfo?.title) {
    errors.push(`第 ${index} 个日程缺少必填字段：title（标题）`)
  }
  
  // 检查可选字段：time
  if (event.time && !isValidTime(event.time)) {
    errors.push(`第 ${index} 个日程的时间格式错误：${event.time}，应为 HH:mm 格式`)
  } else if (!event.time && !event.dateTime?.startTime) {
    warnings.push(`第 ${index} 个日程缺少时间字段，将使用默认值 09:00`)
  }
  
  // 检查可选字段：importance
  if (event.importance && !['high', 'medium', 'low'].includes(event.importance)) {
    warnings.push(`第 ${index} 个日程的优先级值无效：${event.importance}，将使用默认值 medium`)
  }
  
  // 检查完整格式的字段
  if (event.dateTime) {
    if (!event.dateTime.date) {
      errors.push(`第 ${index} 个日程缺少日期字段：dateTime.date`)
    }
    if (!event.dateTime.startTime) {
      warnings.push(`第 ${index} 个日程缺少开始时间，将使用默认值 09:00`)
    }
  }
  
  if (event.basicInfo) {
    if (!event.basicInfo.title) {
      errors.push(`第 ${index} 个日程缺少标题字段：basicInfo.title`)
    }
  }
  
  return { errors, warnings }
}

/**
 * 转换为统一的导出格式
 */
function convertToExportFormat(event: any): ExportEvent {
  // 支持三种数据格式：
  // 1. 完整格式：{ id, dateTime, basicInfo, content, syncInfo }
  // 2. 简单格式：{ id, date, time, title, location, importance, description, endTime, feishuEventId }
  // 3. 最简格式：{ date, title }
  
  // 如果已经是完整格式
  if (event.dateTime && event.basicInfo) {
    return {
      id: event.id || '',
      dateTime: {
        date: event.dateTime.date || '',
        startTime: event.dateTime.startTime || '09:00',
        endTime: event.dateTime.endTime || ''
      },
      basicInfo: {
        title: event.basicInfo.title || '',
        location: event.basicInfo.location || '',
        importance: event.basicInfo.importance || 'medium'
      },
      content: {
        description: event.content?.description || '',
        attachments: event.content?.attachments || [],
        rawDescription: event.content?.rawDescription || ''
      },
      syncInfo: {
        source: event.syncInfo?.source || 'local',
        feishuEventId: event.syncInfo?.feishuEventId || undefined
      }
    }
  }
  
  // 简化格式或最简格式
  return {
    id: event.id || '',
    dateTime: {
      date: event.date || '',
      startTime: event.time || '09:00',
      endTime: event.endTime ? event.endTime.split('T')[1]?.substring(0, 5) || '' : ''
    },
    basicInfo: {
      title: event.title || '',
      location: event.location || '',
      importance: event.importance || 'medium'
    },
    content: {
      description: event.description || '',
      attachments: [],
      rawDescription: event.description || ''
    },
    syncInfo: {
      source: event.feishuEventId ? 'feishu' : 'local',
      feishuEventId: event.feishuEventId || undefined
    }
  }
}

/**
 * 从导出格式转换为本地格式
 */
export function transformToCalendarEvent(exportEvent: ExportEvent): CalendarEvent {
  const date = exportEvent.dateTime?.date || ''
  const time = exportEvent.dateTime?.startTime || '09:00'
  
  // 生成新的 ID
  const newEvent: CalendarEvent = {
    id: exportEvent.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
    date: date,
    time: time,
    title: exportEvent.basicInfo?.title || '',
    location: exportEvent.basicInfo?.location || '',
    importance: exportEvent.basicInfo?.importance || 'medium',
    description: exportEvent.content?.description || '',
    participants: [],
    endTime: exportEvent.dateTime?.endTime 
      ? `${date}T${exportEvent.dateTime.endTime}:00.000Z`
      : calculateDefaultEndTime(date, time),
    feishuEventId: exportEvent.syncInfo?.feishuEventId || undefined,
    lastSyncTime: undefined
  }
  
  return newEvent
}

/**
 * 检测冲突
 * @param newEvents 新事件列表
 * @param existingEvents 现有事件列表
 * @returns 冲突信息
 */
export function detectConflicts(
  newEvents: CalendarEvent[],
  existingEvents: CalendarEvent[]
): ConflictInfo {
  const conflicts: ConflictInfo['conflicts'] = []
  
  // 创建查找映射
  const existingIds = new Map<string, CalendarEvent>()
  const existingKeys = new Map<string, CalendarEvent>()
  
  for (const event of existingEvents) {
    if (event.id) {
      existingIds.set(event.id, event)
    }
    // 使用日期+时间+标题作为唯一键
    const key = `${event.date}-${event.time}-${event.title}`
    existingKeys.set(key, event)
  }
  
  // 检查冲突
  for (const newEvent of newEvents) {
    // 检查 ID 冲突
    if (newEvent.id && existingIds.has(newEvent.id)) {
      conflicts.push({
        newEvent,
        existingEvent: existingIds.get(newEvent.id)!
      })
      continue
    }
    
    // 检查内容冲突
    const key = `${newEvent.date}-${newEvent.time}-${newEvent.title}`
    if (existingKeys.has(key)) {
      conflicts.push({
        newEvent,
        existingEvent: existingKeys.get(key)!
      })
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}

/**
 * 解析冲突 - 跳过重复日程
 * @param newEvents 新事件列表
 * @param existingEvents 现有事件列表
 * @returns 过滤后的新事件列表
 */
export function resolveConflicts(
  newEvents: CalendarEvent[],
  existingEvents: CalendarEvent[]
): CalendarEvent[] {
  const existingIds = new Set(existingEvents.map(e => e.id))
  const existingKeys = new Set(
    existingEvents.map(e => `${e.date}-${e.time}-${e.title}`)
  )
  
  // 过滤掉重复的日程
  return newEvents.filter(event => {
    // 检查 ID 冲突
    if (event.id && existingIds.has(event.id)) {
      return false
    }
    
    // 检查内容冲突
    const key = `${event.date}-${event.time}-${event.title}`
    return !existingKeys.has(key)
  })
}

/**
 * 验证日期格式
 */
function isValidDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(date)) return false
  
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  
  return dateObj.getFullYear() === year &&
         dateObj.getMonth() === month - 1 &&
         dateObj.getDate() === day
}

/**
 * 验证时间格式
 */
function isValidTime(time: string): boolean {
  const regex = /^([01]\d|2[0-3]):[0-5]\d$/
  return regex.test(time)
}

/**
 * 计算默认结束时间（开始时间 + 1小时）
 */
function calculateDefaultEndTime(date: string, time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const endDateTime = new Date(date)
  endDateTime.setHours(hours + 1, minutes, 0, 0)
  
  return endDateTime.toISOString()
}
