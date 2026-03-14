import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

contextBridge.exposeInMainWorld('electron', electronAPI)

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  quit: () => ipcRenderer.invoke('window:quit'),
  setIgnoreMouseEvents: (ignore: boolean) => ipcRenderer.invoke('window:setIgnoreMouseEvents', ignore),
  setWallpaperMode: (enabled: boolean) => ipcRenderer.invoke('window:setWallpaperMode', enabled),
  forceShow: () => ipcRenderer.invoke('window:forceShow'),
  getBounds: () => ipcRenderer.invoke('window:getBounds'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('window:setOpacity', opacity),
  savePosition: (bounds: { x: number; y: number; width: number; height: number }) => 
    ipcRenderer.invoke('window:savePosition', bounds),
  getSavedPosition: () => ipcRenderer.invoke('window:getSavedPosition'),
  onWindowMoved: (callback: (x: number, y: number) => void) => {
    ipcRenderer.on('window:moved', (_, x, y) => callback(x, y))
  },
  onWindowResized: (callback: (width: number, height: number) => void) => {
    ipcRenderer.on('window:resized', (_, width, height) => callback(width, height))
  },
  // 飞书日历相关方法
  feishu: {
    getAuthorizeUrl: () => ipcRenderer.invoke('feishu:getAuthorizeUrl'),
    isLoggedIn: () => ipcRenderer.invoke('feishu:isLoggedIn'),
    getTokenByCode: (code: string) => ipcRenderer.invoke('feishu:getTokenByCode', code),
    logout: () => ipcRenderer.invoke('feishu:logout'),
    getTenantAccessToken: () => ipcRenderer.invoke('feishu:getTenantAccessToken'),
    getCalendarList: () => ipcRenderer.invoke('feishu:getCalendarList'),
    getCalendarListWithToken: (tenantAccessToken: string) => 
      ipcRenderer.invoke('feishu:getCalendarListWithToken', tenantAccessToken),
    createCalendar: (calendarData: { 
      summary: string
      description?: string
      permissions?: 'private' | 'show_only_free_busy' | 'public'
      color?: number
      summaryAlias?: string
    }) => 
      ipcRenderer.invoke('feishu:createCalendar', calendarData),
    getEvents: (calendarId: string, startTime: number, endTime: number) => 
      ipcRenderer.invoke('feishu:getEvents', calendarId, startTime, endTime),
    getEventsWithSyncToken: (calendarId: string, syncToken: string) => 
      ipcRenderer.invoke('feishu:getEventsWithSyncToken', calendarId, syncToken),
    createEvent: (calendarId: string, eventData: any) => 
      ipcRenderer.invoke('feishu:createEvent', calendarId, eventData),
    updateEvent: (calendarId: string, eventId: string, eventData: any) => 
      ipcRenderer.invoke('feishu:updateEvent', calendarId, eventId, eventData),
    deleteEvent: (calendarId: string, eventId: string) => 
      ipcRenderer.invoke('feishu:deleteEvent', calendarId, eventId)
  },
  // 导出功能
  saveExportFile: (data: any, defaultPath: string) => 
    ipcRenderer.invoke('export:saveFile', data, defaultPath)
})
