/**
 * 飞书日程同步工具函数
 */

import { CalendarEvent } from '../types'
import { FEISHU_CONFIG } from '../../../main/feishuConfig'

/**
 * 将飞书时间戳转换为本地日期时间格式
 */
export function convertToLocalDate(timestamp: string): { date: string; time: string } {
  const date = new Date(parseInt(timestamp) * 1000)
  return {
    date: formatDate(date),
    time: formatTime(date)
  }
}

/**
 * 将本地日期时间转换为飞书时间戳格式
 */
export function toFeishuTimestamp(date: string, time: string): string {
  const timestamp = new Date(`${date}T${time}:00`).getTime()
  return Math.floor(timestamp / 1000).toString()
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间为 HH:mm
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 将飞书日程转换为本地日程格式
 */
export function convertToLocalEvent(feishuEvent: any): CalendarEvent {
  const startTime = convertToLocalDate(feishuEvent.start_time.timestamp)
  const endTime = new Date(parseInt(feishuEvent.end_time.timestamp) * 1000)
  
  // ⭐ Handle location: 飞书返回对象，本地存储字符串（只保存 name）
  let location = ''
  if (typeof feishuEvent.location === 'string') {
    location = feishuEvent.location
  } else if (feishuEvent.location && typeof feishuEvent.location === 'object') {
    location = feishuEvent.location.name || ''
  }
  
  // ⭐ 从标题中提取优先级
  let title = feishuEvent.summary || ''
  let importance: 'high' | 'medium' | 'low' = 'medium'
  
  if (title.startsWith('[高]')) {
    importance = 'high'
    title = title.substring(3) // 移除 [高] 前缀
  } else if (title.startsWith('[低]')) {
    importance = 'low'
    title = title.substring(3) // 移除 [低] 前缀
  }
  
  const result = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    date: startTime.date,
    time: startTime.time,
    title: title, // 移除优先级前缀后的标题
    location: location,
    description: feishuEvent.description || '',
    importance: importance, // ⭐ 提取优先级
    documents: [],
    feishuEventId: feishuEvent.event_id,
    endTime: endTime.toISOString(),
    lastSyncTime: Date.now()
  }
  
  console.log('🔄 Converted Feishu event:', {
    feishuId: feishuEvent.event_id,
    localId: result.id,
    summary: feishuEvent.summary,
    title: result.title,
    importance: result.importance,
    location: result.location,
    date: result.date,
    time: result.time,
    status: feishuEvent.status
  })
  
  return result
}

/**
 * 生成唯一的本地 ID
 */
export function generateLocalId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

/**
 * 保存 sync_token 到 localStorage
 */
export function saveSyncToken(token: string): void {
  localStorage.setItem('feishu_sync_token', token)
}

/**
 * 从 localStorage 加载 sync_token
 */
export function loadSyncToken(): string | null {
  return localStorage.getItem('feishu_sync_token')
}

/**
 * 保存最后同步时间
 */
export function saveLastSyncTime(time: number): void {
  localStorage.setItem('feishu_last_sync_time', time.toString())
}

/**
 * 加载最后同步时间
 */
export function loadLastSyncTime(): number | null {
  const time = localStorage.getItem('feishu_last_sync_time')
  return time ? parseInt(time) : null
}

/**
 * 从本地事件中查找与飞书事件 ID 匹配的事件
 */
export function findLocalByFeishuId(events: CalendarEvent[], feishuEventId: string): CalendarEvent | null {
  return events.find(event => event.feishuEventId === feishuEventId) || null
}

/**
 * 合并事件到本地数据（避免重复）
 */
export function mergeEvents(localEvents: CalendarEvent[], newEvents: CalendarEvent[]): CalendarEvent[] {
  const eventMap = new Map<string, CalendarEvent>()
  
  // 先添加本地事件
  localEvents.forEach(event => {
    eventMap.set(event.id, event)
  })
  
  // 再添加新事件（如果 ID 已存在则跳过）
  newEvents.forEach(event => {
    if (!eventMap.has(event.id)) {
      eventMap.set(event.id, event)
    }
  })
  
  return Array.from(eventMap.values())
}
