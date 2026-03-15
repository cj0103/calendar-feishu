import { useState, useEffect } from 'react'
import { Settings } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onSaveSettings: (settings: Settings) => void
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}: SettingsModalProps): JSX.Element | null {
  const [localSettings, setLocalSettings] = useState<Settings>(settings)
  const [activeTab, setActiveTab] = useState<'appearance' | 'text' | 'window'>('appearance')

  useEffect(() => {
    if (isOpen) {
      setLocalSettings({
        windowOpacity: settings.windowOpacity ?? 100,
        windowWidth: settings.windowWidth ?? 1200,
        windowHeight: settings.windowHeight ?? 700,
        windowX: settings.windowX ?? 100,
        windowY: settings.windowY ?? 100,
        workdayColor: settings.workdayColor || '#eff6ff',
        weekendColor: settings.weekendColor || '#fef2f2',
        otherMonthColor: settings.otherMonthColor || '#f3f4f6',
        calendarColor: settings.calendarColor || '#1f2937',
        calendarFontSize: settings.calendarFontSize ?? 14,
        calendarFontFamily: settings.calendarFontFamily || 'inherit'
      })
    }
  }, [isOpen, settings])

  const handleSave = (): void => {
    onSaveSettings(localSettings)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[450px] max-h-[600px] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold">设置</h2>
          
          {/* 标签页导航 */}
          <div className="flex border-b border-gray-200 mt-4">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'appearance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('appearance')}
            >
              外观
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'text'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('text')}
            >
              文字
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'window'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('window')}
            >
              窗口
            </button>
          </div>
        </div>
        
        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 外观标签页 */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  背景透明度：{localSettings.windowOpacity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={localSettings.windowOpacity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setLocalSettings(prev => ({ ...prev, windowOpacity: value }))
                  }}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  透明度仅影响背景色，文字保持清晰
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">日历背景颜色</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">工作日背景</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={localSettings.workdayColor}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, workdayColor: e.target.value }))}
                        placeholder="#eff6ff"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="color"
                        value={localSettings.workdayColor}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, workdayColor: e.target.value }))}
                        className="w-8 h-8 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">周末背景</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={localSettings.weekendColor}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, weekendColor: e.target.value }))}
                        placeholder="#fef2f2"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="color"
                        value={localSettings.weekendColor}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, weekendColor: e.target.value }))}
                        className="w-8 h-8 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">其他月背景</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={localSettings.otherMonthColor}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, otherMonthColor: e.target.value }))}
                        placeholder="#f3f4f6"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <input
                        type="color"
                        value={localSettings.otherMonthColor}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, otherMonthColor: e.target.value }))}
                        className="w-8 h-8 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 文字标签页 */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* 日历文字颜色 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日历文字颜色（公历和农历）
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={localSettings.calendarColor}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, calendarColor: e.target.value }))}
                    placeholder="#1f2937"
                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <input
                    type="color"
                    value={localSettings.calendarColor}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, calendarColor: e.target.value }))}
                    className="w-8 h-8 cursor-pointer"
                  />
                </div>
              </div>

              {/* 日历文字大小 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日历文字大小：{localSettings.calendarFontSize}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="24"
                  step="1"
                  value={localSettings.calendarFontSize}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    setLocalSettings(prev => ({ ...prev, calendarFontSize: value }))
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10px</span>
                  <span>24px</span>
                </div>
              </div>

              {/* 日历文字字体 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日历文字字体
                </label>
                <select
                  value={localSettings.calendarFontFamily}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, calendarFontFamily: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="inherit">默认字体</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
                  <option value="'SimSun', serif">宋体</option>
                  <option value="'SimHei', sans-serif">黑体</option>
                  <option value="consolas, monospace">Consolas (等宽)</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>

              {/* 预览区域 */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">预览效果</p>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div 
                    className="flex items-center gap-3"
                    style={{
                      color: localSettings.calendarColor,
                      fontSize: `${localSettings.calendarFontSize}px`,
                      fontFamily: localSettings.calendarFontFamily
                    }}
                  >
                    <span className="font-medium">15</span>
                    <span className="opacity-75">腊月廿五</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 窗口标签页 */}
          {activeTab === 'window' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">✅ 桌面常驻显示已启用</h3>
                <p className="text-xs text-green-800 leading-relaxed">
                  窗口已设置为桌面常驻模式：<br/>
                  • 显示在壁纸上层，其他应用下层<br/>
                  • 不在任务栏显示<br/>
                  • 不在 Alt+Tab 切换列表中出现<br/>
                  • 窗口位置和大小时刻保存
                </p>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">窗口信息</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs mb-1">宽度</div>
                    <div className="text-gray-900 font-medium">{localSettings.windowWidth}px</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs mb-1">高度</div>
                    <div className="text-gray-900 font-medium">{localSettings.windowHeight}px</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs mb-1">X 坐标</div>
                    <div className="text-gray-900 font-medium">{localSettings.windowX}px</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-gray-500 text-xs mb-1">Y 坐标</div>
                    <div className="text-gray-900 font-medium">{localSettings.windowY}px</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">💡 使用提示</h3>
                <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                  <li>右键点击系统托盘图标可快速显示/隐藏窗口</li>
                  <li>窗口位置会自动保存，下次启动时恢复</li>
                  <li>开启鼠标穿透模式后可与桌面图标交互</li>
                  <li>如需调整窗口位置，直接拖拽即可</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 固定底部按钮 */}
        <div className="border-t border-gray-200 p-6 bg-white sticky bottom-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors shadow-sm"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
