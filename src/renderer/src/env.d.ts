/// <reference types="vite/client" />

interface FeishuCalendar {
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

interface Window {
  api: {
    minimize: () => Promise<void>
    close: () => Promise<void>
    quit: () => Promise<void>
    setIgnoreMouseEvents: (ignore: boolean) => Promise<void>
    setWallpaperMode: (enabled: boolean) => Promise<void>
    forceShow: () => Promise<void>
    getBounds: () => Promise<{ width: number; height: number; x: number; y: number }>
    setOpacity: (opacity: number) => Promise<void>
    onWindowMoved: (callback: () => void) => void
    onWindowResized: (callback: () => void) => void
    feishu: {
      getAuthorizeUrl: () => Promise<string>
      isLoggedIn: () => Promise<boolean>
      getTokenByCode: (code: string) => Promise<any>
      logout: () => Promise<void>
      getTenantAccessToken: () => Promise<any>
      getCalendarList: () => Promise<{ success: boolean; calendars?: FeishuCalendar[]; error?: string }>
      getCalendarListWithToken: (tenantAccessToken: string) => Promise<any>
      createCalendar: (calendarData: { 
        summary: string
        description?: string
        permissions?: 'private' | 'show_only_free_busy' | 'public'
        color?: number
        summaryAlias?: string
      }) => Promise<{ success: boolean; calendar?: FeishuCalendar; error?: string }>
      getEvents: (calendarId: string, startTime: number, endTime: number) => Promise<any>
      getEventsWithSyncToken: (calendarId: string, syncToken: string) => Promise<any>
      createEvent: (calendarId: string, eventData: any) => Promise<any>
      updateEvent: (calendarId: string, eventId: string, eventData: any) => Promise<any>
      deleteEvent: (calendarId: string, eventId: string) => Promise<any>
    }
    saveExportFile: (data: any, defaultPath: string) => Promise<any>
  }
}
