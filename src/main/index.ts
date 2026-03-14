/**
 * 桌面日历应用 - 主进程入口
 * 功能包括：窗口管理、系统托盘、IPC 通信、飞书 API 集成等
 */
import { app, shell, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { feishuAuth } from './feishuAuth'
import { feishuCalendarAPI } from './feishuCalendar'
import { FEISHU_CONFIG } from './feishuConfig'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 窗口配置文件路径（存储窗口位置和大小）
const WINDOW_CONFIG_PATH = join(app.getPath('userData'), 'window-config.json')

/**
 * 读取窗口配置文件
 * @returns 窗口配置对象，包含 x, y, width, height
 */
function loadWindowConfig(): { x?: number; y?: number; width?: number; height?: number } | null {
  try {
    if (existsSync(WINDOW_CONFIG_PATH)) {
      const data = readFileSync(WINDOW_CONFIG_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load window config:', error)
  }
  return null
}

/**
 * 保存窗口配置到文件
 * @param config 窗口配置对象
 */
function saveWindowConfig(config: { x: number; y: number; width: number; height: number }): void {
  try {
    writeFileSync(WINDOW_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save window config:', error)
  }
}

function createTray(): void {
  let trayIcon: nativeImage
  
  if (is.dev) {
    // 开发环境：从 build 目录加载
    const iconPath = join(__dirname, '../../build/icon.png')
    try {
      trayIcon = nativeImage.createFromPath(iconPath)
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty()
      }
    } catch {
      trayIcon = nativeImage.createEmpty()
    }
  } else {
    // 生产环境：从 resources 目录加载
    const iconPath = join(process.resourcesPath, 'icon.png')
    try {
      trayIcon = nativeImage.createFromPath(iconPath)
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty()
      }
    } catch {
      trayIcon = nativeImage.createEmpty()
    }
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('桌面日历')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示日历',
      click: () => {
        mainWindow?.show()
        mainWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      }
    },
    {
      label: '强制显示',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      }
    },
    {
      label: '退出',
      click: () => {
        if (mainWindow) {
          mainWindow.destroy()
          mainWindow = null
        }
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.setVisibleOnAllWorkspaces(true)
  })
}

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  
  // 加载保存的窗口配置
  const savedConfig = loadWindowConfig()
  const windowConfig = {
    width: savedConfig?.width ?? 1200,
    height: savedConfig?.height ?? 700,
    x: savedConfig?.x ?? Math.floor((screenWidth - 1200) / 2),
    y: savedConfig?.y ?? Math.floor((screenHeight - 700) / 2)
  }

  mainWindow = new BrowserWindow({
    width: windowConfig.width,
    height: windowConfig.height,
    x: windowConfig.x,
    y: windowConfig.y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    // 关键配置：不置顶，让窗口在其他应用下方
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 设置为在所有工作区可见（包括虚拟桌面）
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  console.log('Set window visible on all workspaces')

  console.log('Window will show in ready-to-show event')
  mainWindow.on('ready-to-show', () => {
    console.log('Window is ready to show, calling show()')
    mainWindow?.show()
    console.log('Window show() called, now calling focus()')
    mainWindow?.focus()
    console.log('Window focus() called')
  })

  mainWindow.on('show', () => {
    console.log('Window show event triggered')
    // 重新显示时确保层级正确
    mainWindow?.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  })

  // 处理窗口失去焦点（点击桌面其他地方）
  mainWindow.on('blur', () => {
    console.log('Window blur event - calendar lost focus')
    // 不最小化，保持显示
  })

  mainWindow.on('close', (event) => {
    console.log('Window close event triggered, hiding instead')
    event.preventDefault()
    mainWindow?.hide()
  })

  // 窗口移动时发送位置信息
  mainWindow.on('moved', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      mainWindow.webContents.send('window:moved', bounds.x, bounds.y)
    }
  })

  // 窗口大小变化时发送尺寸信息
  mainWindow.on('resized', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      mainWindow.webContents.send('window:resized', bounds.width, bounds.height)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.desktop.calendar')

  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('feishu-calendar')
  } else {
    if (process.platform === 'win32') {
      app.setAsDefaultProtocolClient('feishu-calendar', process.execPath, [process.argv[1]])
    } else {
      app.setAsDefaultProtocolClient('feishu-calendar')
    }
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (url.startsWith('feishu-calendar://auth')) {
      const urlObj = new URL(url)
      const code = urlObj.searchParams.get('code')
      if (code && mainWindow) {
        mainWindow.webContents.send('feishu:auth-code', code)
      }
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.hide()
  })

  ipcMain.handle('window:quit', () => {
    if (mainWindow) {
      mainWindow.destroy()
      mainWindow = null
    }
    app.quit()
  })

  ipcMain.handle('window:setIgnoreMouseEvents', (_, ignore: boolean) => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(ignore, { forward: true })
      console.log('Mouse ignore set to:', ignore)
    }
  })

  // 添加窗口层级控制（不再需要）
  ipcMain.handle('window:setWallpaperMode', (_, enabled: boolean) => {
    if (!mainWindow) return
    console.log('setWallpaperMode called but not implemented')
  })

  // 强制显示窗口
  ipcMain.handle('window:forceShow', () => {
    if (!mainWindow) return
    
    mainWindow.show()
    mainWindow.focus()
    // 确保在所有工作区可见
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    console.log('Window force shown')
  })

  ipcMain.handle('window:getBounds', () => {
    if (!mainWindow) return { width: 1200, height: 700, x: 100, y: 100 }
    const bounds = mainWindow.getBounds()
    return bounds
  })

  ipcMain.handle('window:setOpacity', (_, opacity: number) => {
    mainWindow?.setOpacity(opacity)
  })

  // 保存窗口位置和大小
  ipcMain.handle('window:savePosition', (_, bounds: { x: number; y: number; width: number; height: number }) => {
    saveWindowConfig(bounds)
  })

  // 获取保存的窗口位置
  ipcMain.handle('window:getSavedPosition', () => {
    return loadWindowConfig()
  })

  ipcMain.handle('feishu:getAuthorizeUrl', () => {
    return feishuAuth.getAuthorizeUrl()
  })

  ipcMain.handle('feishu:isLoggedIn', () => {
    return feishuAuth.isLoggedIn()
  })

  ipcMain.handle('feishu:getTokenByCode', async (_, code: string) => {
    try {
      const token = await feishuAuth.getTokenByCode(code)
      return { success: true, token }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('feishu:logout', () => {
    feishuAuth.logout()
    return { success: true }
  })

  ipcMain.handle('feishu:getTenantAccessToken', async () => {
    try {
      const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.appId,
          app_secret: FEISHU_CONFIG.appSecret
        })
      })
      
      const data = await response.json()
      if (data.code === 0) {
        return { success: true, token: data }
      } else {
        return { success: false, error: data.msg || '获取 tenant_access_token 失败' }
      }
    } catch (error: any) {
      return { success: false, error: error.message || '获取 tenant_access_token 失败' }
    }
  })

  // 使用 tenant_access_token 获取日历列表
  ipcMain.handle('feishu:getCalendarListWithToken', async (_, tenantAccessToken: string) => {
    try {
      const axios = require('axios')
      
      // 使用完整的 URL（查询应用身份下的共享日历）
      const fullUrl = 'https://open.feishu.cn/open-apis/calendar/v4/calendars?type=shared'
      
      console.log('========== 飞书日历 API 请求 ==========')
      console.log('请求 URL:', fullUrl)
      console.log('请求方法: GET')
      console.log('Authorization: Bearer', tenantAccessToken)
      console.log('========================================')
      
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': `Bearer ${tenantAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: FEISHU_CONFIG.timeout
      })
      
      console.log('========== 飞书日历 API 响应 ==========')
      console.log('响应状态码:', response.status)
      console.log('响应数据:', JSON.stringify(response.data, null, 2))
      console.log('========================================')
      
      if (response.data.code === 0) {
        console.log('获取日历成功，数量:', response.data.data.items?.length || 0)
        return { success: true, calendars: response.data.data.items || [] }
      } else {
        console.error('API 返回错误:', response.data.msg)
        return { success: false, error: response.data.msg || '获取日历列表失败' }
      }
    } catch (error: any) {
      console.error('========== 飞书日历 API 错误 ==========')
      console.error('错误类型:', error.constructor.name)
      console.error('错误消息:', error.message)
      if (error.response) {
        console.error('错误状态码:', error.response.status)
        console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2))
      }
      console.error('========================================')
      
      const errorMsg = error.response?.data?.msg || error.message || '获取日历列表失败'
      return { success: false, error: errorMsg }
    }
  })

  // 创建日历（使用 user_access_token）
  ipcMain.handle('feishu:createCalendar', async (_, calendarData: {
    summary: string
    description?: string
    permissions?: 'private' | 'show_only_free_busy' | 'public'
    color?: number
    summaryAlias?: string
  }) => {
    try {
      const calendar = await feishuCalendarAPI.createCalendar(
        calendarData.summary,
        calendarData.description,
        calendarData.permissions,
        calendarData.color,
        calendarData.summaryAlias
      )
      
      console.log('创建日历成功:', calendar)
      return { success: true, calendar }
    } catch (error: any) {
      console.error('创建日历错误:', error)
      return { success: false, error: error.message || '创建日历失败' }
    }
  })

  // 使用 user_access_token 获取日历列表（推荐方式）
  ipcMain.handle('feishu:getCalendarList', async () => {
    try {
      const userAccessToken = await feishuAuth.getAccessToken()
      const axios = require('axios')
      
      const response = await axios.get('https://open.feishu.cn/open-apis/calendar/v4/calendars', {
        headers: {
          'Authorization': `Bearer ${userAccessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: FEISHU_CONFIG.timeout
      })
      
      if (response.data.code === 0) {
        return { success: true, calendars: response.data.data.items || [] }
      } else {
        return { success: false, error: response.data.msg || '获取日历列表失败' }
      }
    } catch (error: any) {
      console.error('获取日历列表失败:', error)
      return { success: false, error: error.message || '获取日历列表失败' }
    }
  })

  // 获取日程列表
  ipcMain.handle('feishu:getEvents', async (_, calendarId: string, startTime: number, endTime: number) => {
    try {
      const result = await feishuCalendarAPI.getEvents(calendarId, startTime, endTime)
      return result // 直接返回 API 的结果 { success, events, sync_token }
    } catch (error: any) {
      return { success: false, error: error.message, events: [] }
    }
  })

  // 使用 sync_token 增量获取日程
  ipcMain.handle('feishu:getEventsWithSyncToken', async (_, calendarId: string, syncToken: string) => {
    try {
      const result = await feishuCalendarAPI.getEventsWithSyncToken(calendarId, syncToken)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('feishu:createEvent', async (_, calendarId: string, eventData: any) => {
    try {
      // 直接使用前端传来的数据，不需要转换
      const axios = require('axios')
      
      // 获取 tenant_access_token
      const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.appId,
          app_secret: FEISHU_CONFIG.appSecret
        })
      })
      
      const tokenData = await tokenResponse.json()
      console.log('Token 响应:', tokenData)
      
      if (!tokenData || !tokenData.tenant_access_token) {
        throw new Error('获取 tenant_access_token 失败：' + (tokenData.msg || '未知错误'))
      }
      
      const tenantAccessToken = tokenData.tenant_access_token
      console.log('获取到 tenant_access_token:', tenantAccessToken.substring(0, 20) + '...')

      console.log('========== 创建日程请求 ==========')
      console.log('日历 ID:', calendarId)
      console.log('日程数据:', JSON.stringify(eventData, null, 2))
      console.log('请求 URL:', `https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events`)
      console.log('请求头:', {
        'Authorization': `Bearer ${tenantAccessToken.substring(0, 20)}...`,
        'Content-Type': 'application/json; charset=utf-8',
        'Locale': 'zh_cn'
      })
      console.log('========================================')

      // 使用 Buffer 确保中文正确编码
      const requestData = JSON.stringify(eventData)
      console.log('请求体长度:', Buffer.byteLength(requestData, 'utf8'), 'bytes')

      const response = await axios.post(
        `https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${tenantAccessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Locale': 'zh_cn'
          },
          timeout: FEISHU_CONFIG.timeout
        }
      )
      
      console.log('========== 创建日程响应 ==========')
      console.log('状态码:', response.status)
      console.log('返回数据:', JSON.stringify(response.data, null, 2))
      console.log('========================================')
      
      if (response.data.code === 0) {
        console.log('创建日程成功:', response.data.data)
        console.log('⭐ event_id:', response.data.data?.event?.event_id)
        console.log('⭐ 完整返回数据结构:', {
          hasData: !!response.data.data,
          dataKeys: response.data.data ? Object.keys(response.data.data) : [],
          eventId: response.data.data?.event?.event_id,
          summary: response.data.data?.event?.summary
        })
        // ⭐ 返回 response.data.data.event，因为飞书 API 返回的是 { event: {...} }
        return { success: true, event: response.data.data.event }
      } else {
        console.error('创建日程失败:', response.data.msg)
        return { success: false, error: response.data.msg || '创建日程失败' }
      }
    } catch (error: any) {
      console.error('========== 创建日程错误 ==========')
      console.error('错误类型:', error.constructor.name)
      console.error('错误消息:', error.message)
      if (error.response) {
        console.error('错误状态码:', error.response.status)
        console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2))
      }
      console.error('========================================')
      return { success: false, error: error.message || '创建日程失败' }
    }
  })

  ipcMain.handle('feishu:updateEvent', async (_, calendarId: string, eventId: string, eventData: any) => {
    try {
      // 直接使用前端传来的数据，不需要转换
      const axios = require('axios')
      const tenantAccessToken = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: FEISHU_CONFIG.appId,
          app_secret: FEISHU_CONFIG.appSecret
        })
      }).then(res => res.json()).then(data => data.tenant_access_token)

      console.log('========== 修改日程请求 ==========')
      console.log('日历 ID:', calendarId)
      console.log('日程 ID:', eventId)
      console.log('日程数据:', JSON.stringify(eventData, null, 2))
      console.log('请求 URL:', `https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`)
      console.log('请求头:', {
        'Authorization': `Bearer ${tenantAccessToken.substring(0, 20)}...`,
        'Content-Type': 'application/json; charset=utf-8',
        'Locale': 'zh_cn'
      })
      console.log('========================================')

      // 使用 Buffer 确保中文正确编码
      const requestData = JSON.stringify(eventData)
      console.log('请求体长度:', Buffer.byteLength(requestData, 'utf8'), 'bytes')

      const response = await axios.patch(
        `https://open.feishu.cn/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${tenantAccessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Locale': 'zh_cn'
          },
          timeout: FEISHU_CONFIG.timeout
        }
      )
      
      console.log('========== 修改日程响应 ==========')
      console.log('状态码:', response.status)
      console.log('返回数据:', JSON.stringify(response.data, null, 2))
      console.log('========================================')
      
      if (response.data.code === 0) {
        console.log('修改日程成功:', response.data.data)
        return { success: true, event: response.data.data }
      } else {
        console.error('修改日程失败:', response.data.msg)
        return { success: false, error: response.data.msg || '修改日程失败' }
      }
    } catch (error: any) {
      console.error('========== 修改日程错误 ==========')
      console.error('错误类型:', error.constructor.name)
      console.error('错误消息:', error.message)
      if (error.response) {
        console.error('错误状态码:', error.response.status)
        console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2))
      }
      console.error('========================================')
      return { success: false, error: error.message || '修改日程失败' }
    }
  })

  ipcMain.handle('feishu:deleteEvent', async (_, calendarId: string, eventId: string) => {
    try {
      await feishuCalendarAPI.deleteEvent(calendarId, eventId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 导出文件保存
  ipcMain.handle('export:saveFile', async (_, data: any, defaultPath: string) => {
    const { dialog } = require('electron')
    const { writeFileSync } = require('fs')
    
    const result = await dialog.showSaveDialog({
      title: '导出日程数据',
      defaultPath: defaultPath || 'calendar-export.json',
      filters: [
        { name: 'JSON 文件', extensions: ['json'] }
      ]
    })
    
    if (!result.canceled && result.filePath) {
      try {
        // 美化 JSON 格式，便于阅读
        writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
        return { success: true, filePath: result.filePath }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
    
    return { success: false, canceled: true }
  })

  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
