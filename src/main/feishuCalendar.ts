import axios from 'axios'
import { FEISHU_CONFIG } from './feishuConfig'
import { feishuAuth } from './feishuAuth'

/**
 * 飞书日历事件接口
 */
export interface FeishuEvent {
  event_id: string
  summary: string
  description?: string
  start_time: {
    timestamp: string
    timezone?: string
  }
  end_time: {
    timestamp: string
    timezone?: string
  }
  location?: string
  attendees?: Array<{
    user_id?: string
    email?: string
    name?: string
  }>
  organizer?: {
    user_id?: string
    email?: string
    name?: string
  }
  reminders?: {
    use_default?: boolean
    items?: Array<{
      minutes: number
    }>
  }
  recurrence?: {
    interval?: number
    by_weekday?: string[]
    end_time?: {
      timestamp: string
    }
  }
}

/**
 * 本地日历事件接口（转换后）
 */
export interface LocalCalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  calendarId: string
  isFeishuEvent: boolean
}

/**
 * 飞书日历 API 调用类
 */
class FeishuCalendarAPI {
  private readonly baseUrl = FEISHU_CONFIG.apiBaseUrl

  /**
   * 获取 HTTP 客户端（带认证头）
   */
  private async getHttpClient() {
    try {
      console.log('[Token] 正在获取 tenant_access_token...')
      const tokenResult = await feishuAuth.getTenantAccessToken()
      if (!tokenResult || !tokenResult.tenant_access_token) {
        console.error('[Token] 未获取到 tenant_access_token')
        throw new Error('未获取到 tenant_access_token，请检查飞书应用配置')
      }
      
      console.log('[Token] 成功获取 tenant_access_token')
      return axios.create({
        baseURL: this.baseUrl,
        timeout: FEISHU_CONFIG.timeout,
        headers: {
          'Authorization': `Bearer ${tokenResult.tenant_access_token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error: any) {
      console.error('[HTTP Client Error]', error.message)
      throw new Error(`获取授权失败：${error.message}`)
    }
  }

  /**
   * 获取日历列表
   */
  async getCalendarList(): Promise<any[]> {
    try {
      const client = await this.getHttpClient()
      console.log('[Calendar API] 请求获取日历列表...')
      const response = await client.get('/calendar/v4/calendars')
      
      if (response.data.code === 0) {
        // 飞书 API 返回的是 calendar_list 而不是 items
        const calendars = response.data.data.calendar_list || response.data.data.items || []
        console.log(`[Calendar API] 成功获取 ${calendars.length} 个日历`)
        calendars.forEach((cal: any, i: number) => {
          console.log(`  [${i+1}] ${cal.summary} (${cal.calendar_id})`)
        })
        return calendars
      } else {
        console.error('[Calendar API Error]', response.data.msg)
        throw new Error(response.data.msg || '获取日历列表失败')
      }
    } catch (error: any) {
      console.error('[Calendar API Error]', error.message)
      throw new Error(error.message || '获取日历列表失败')
    }
  }

  /**
   * 创建共享日历
   * @param summary 日历标题
   * @param description 日历描述
   * @param permissions 日历公开范围
   * @param color 日历颜色
   * @param summaryAlias 日历备注名
   */
  async createCalendar(
    summary: string,
    description?: string,
    permissions?: 'private' | 'show_only_free_busy' | 'public',
    color?: number,
    summaryAlias?: string
  ): Promise<any> {
    try {
      const client = await this.getHttpClient()
      const response = await client.post('/calendar/v4/calendars', {
        summary,
        description: description || '',
        permissions: permissions || 'private',
        color: color || -1,
        summary_alias: summaryAlias || ''
      })
      
      if (response.data.code === 0) {
        return response.data.data.calendar
      } else {
        throw new Error(response.data.msg || '创建日历失败')
      }
    } catch (error: any) {
      console.error('创建日历失败:', error)
      if (error.response) {
        console.error('❌ HTTP 错误响应:', error.response.data)
      }
      throw new Error(error.message || '创建日历失败')
    }
  }

  /**
   * 删除日历
   * @param calendarId 日历 ID
   */
  async deleteCalendar(calendarId: string): Promise<void> {
    try {
      console.log('[Calendar API] 请求删除日历:', calendarId)
      const client = await this.getHttpClient()
      const response = await client.delete(`/calendar/v4/calendars/${calendarId}`)
      
      if (response.data.code === 0) {
        console.log('[Calendar API] 成功删除日历:', calendarId)
      } else {
        console.error('[Calendar API Error]', response.data.msg)
        throw new Error(response.data.msg || '删除日历失败')
      }
    } catch (error: any) {
      console.error('[Calendar API Error]', error.message)
      throw new Error(error.message || '删除日历失败')
    }
  }

  /**
   * 获取指定日历的事件列表
   * @param calendarId 日历 ID
   * @param startTime 开始时间（时间戳，秒）
   * @param endTime 结束时间（时间戳，秒）
   */
  async getEvents(calendarId: string, startTime: number, endTime: number): Promise<any> {
    try {
      const client = await this.getHttpClient()
      const response = await client.get(
        `/calendar/v4/calendars/${calendarId}/events`,
        {
          params: {
            start_time: startTime.toString(),
            end_time: endTime.toString(),
            page_size: 500
          }
        }
      )
      
      if (response.data.code === 0) {
        return {
          success: true,
          events: response.data.data.items || [],
          sync_token: response.data.data.sync_token || null,
          page_token: response.data.data.page_token || null
        }
      } else {
        return {
          success: false,
          error: response.data.msg || '获取事件列表失败'
        }
      }
    } catch (error: any) {
      console.error('获取事件列表失败:', error)
      return {
        success: false,
        error: error.message || '获取事件列表失败'
      }
    }
  }

  /**
   * 使用 sync_token 增量获取事件
   * @param calendarId 日历 ID
   * @param syncToken 增量同步标记
   */
  async getEventsWithSyncToken(calendarId: string, syncToken: string): Promise<any> {
    try {
      const client = await this.getHttpClient()
      const response = await client.get(
        `/calendar/v4/calendars/${calendarId}/events`,
        {
          params: {
            sync_token: syncToken
          }
        }
      )
      
      if (response.data.code === 0) {
        return {
          success: true,
          events: response.data.data.items || [],
          sync_token: response.data.data.sync_token || null,
          page_token: response.data.data.page_token || null
        }
      } else {
        return {
          success: false,
          error: response.data.msg || '增量获取事件失败'
        }
      }
    } catch (error: any) {
      console.error('增量获取事件失败:', error)
      return {
        success: false,
        error: error.message || '增量获取事件失败'
      }
    }
  }

  /**
   * 创建事件
   * @param calendarId 日历 ID
   * @param eventData 事件数据
   */
  async createEvent(calendarId: string, eventData: Partial<FeishuEvent>): Promise<FeishuEvent> {
    try {
      console.log('📤 Feishu createEvent request:', {
        calendarId,
        eventData: JSON.stringify(eventData, null, 2)
      })
      
      const client = await this.getHttpClient()
      const response = await client.post(
        `/calendar/v4/calendars/${calendarId}/events`,
        eventData
      )
      
      console.log('📥 Feishu createEvent response:', response.data)
      
      if (response.data.code === 0) {
        return response.data.data
      } else {
        console.error('❌ Feishu API error:', response.data)
        throw new Error(response.data.msg || '创建事件失败')
      }
    } catch (error: any) {
      console.error('创建事件失败:', error)
      if (error.response) {
        console.error('❌ HTTP 错误响应:', error.response.data)
      }
      throw new Error(error.message || '创建事件失败')
    }
  }

  /**
   * 更新事件
   * @param calendarId 日历 ID
   * @param eventId 事件 ID
   * @param eventData 更新的事件数据
   */
  async updateEvent(calendarId: string, eventId: string, eventData: Partial<FeishuEvent>): Promise<FeishuEvent> {
    try {
      const client = await this.getHttpClient()
      const response = await client.put(
        `/calendar/v4/calendars/${calendarId}/events/${eventId}`,
        eventData
      )
      
      if (response.data.code === 0) {
        return response.data.data
      } else {
        throw new Error(response.data.msg || '更新事件失败')
      }
    } catch (error: any) {
      console.error('更新事件失败:', error)
      throw new Error(error.message || '更新事件失败')
    }
  }

  /**
   * 删除事件
   * @param calendarId 日历 ID
   * @param eventId 事件 ID
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      const client = await this.getHttpClient()
      const response = await client.delete(
        `/calendar/v4/calendars/${calendarId}/events/${eventId}`
      )
      
      if (response.data.code !== 0) {
        throw new Error(response.data.msg || '删除事件失败')
      }
    } catch (error: any) {
      console.error('删除事件失败:', error)
      throw new Error(error.message || '删除事件失败')
    }
  }

  /**
   * 将飞书事件转换为本地格式
   */
  convertToLocalEvent(event: FeishuEvent, calendarId: string): LocalCalendarEvent {
    return {
      id: event.event_id,
      title: event.summary,
      description: event.description,
      startTime: event.start_time.timestamp,
      endTime: event.end_time.timestamp,
      location: event.location,
      calendarId: calendarId,
      isFeishuEvent: true
    }
  }

  /**
   * 将本地事件转换为飞书格式
   */
  convertToFeishuEvent(event: any): Partial<FeishuEvent> {
    return {
      summary: event.title,
      description: event.description,
      start_time: {
        timestamp: event.startTime.toString()
      },
      end_time: {
        timestamp: event.endTime.toString()
      },
      location: event.location,
      reminders: {
        use_default: true
      }
    }
  }
}

export const feishuCalendarAPI = new FeishuCalendarAPI()
