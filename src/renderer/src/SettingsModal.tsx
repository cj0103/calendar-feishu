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
        otherMonthColor: settings.otherMonthColor || '#f3f4f6'
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
      <div className="bg-white rounded-lg shadow-2xl w-[400px] p-6">
        <h2 className="text-lg font-bold mb-4">设置</h2>
        
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">日历颜色</h3>
            <div className="space-y-2">
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

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">窗口信息</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>宽度：{localSettings.windowWidth}px</div>
              <div>高度：{localSettings.windowHeight}px</div>
              <div>X: {localSettings.windowX}px</div>
              <div>Y: {localSettings.windowY}px</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              窗口位置和大小已自动保存，关闭后重启将自动应用
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
