import { useState, useEffect } from 'react'
import { CalendarEvent } from './types'
import {
  validateImportData,
  transformToCalendarEvent,
  resolveConflicts,
  ValidationResult
} from './utils/importUtils'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (events: CalendarEvent[], syncToFeishu: boolean) => void
  onExport: (startDate: string, endDate: string) => void
  existingEvents: CalendarEvent[]
  totalEvents: number
}

type Mode = 'select' | 'import' | 'export'

export default function ImportExportModal({
  isOpen,
  onClose,
  onImport,
  onExport,
  existingEvents
}: ImportExportModalProps): JSX.Element | null {
  const [mode, setMode] = useState<Mode>('select')
  const [fileContent, setFileContent] = useState<any>(null)
  const [fileName, setFileName] = useState('')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [syncToFeishu, setSyncToFeishu] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 导出相关状态
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  
  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setMode('select')
      setFileContent(null)
      setFileName('')
      setValidation(null)
      setSyncToFeishu(false)
      setImporting(false)
      setExporting(false)
      setError(null)
      // 设置默认的导出日期范围为最近 30 天
      const today = new Date()
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      setEndDate(today.toISOString().split('T')[0])
      setLastMonth(lastMonth.toISOString().split('T')[0])
    }
  }, [isOpen])
  
  const setLastMonth = (date: string) => {
    setStartDate(date)
  }
  
  // 选择导入文件
  const handleSelectFile = async () => {
    try {
      setError(null)
      const result = await window.api.openImportFile()
      
      if (result.canceled) {
        return
      }
      
      setFileName(result.filePath.split(/[/\\]/).pop() || result.filePath)
      
      // 解析 JSON
      try {
        const data = JSON.parse(result.content)
        setFileContent(data)
        
        // 验证数据
        const validationResult = validateImportData(data)
        setValidation(validationResult)
        
        // 切换到导入确认模式
        setMode('import')
      } catch (parseError: any) {
        setError('文件格式错误：无法解析 JSON 文件')
        setFileContent(null)
        setValidation(null)
      }
    } catch (err: any) {
      setError('文件读取失败：' + (err.message || '未知错误'))
    }
  }
  
  // 执行导入
  const handleImport = async () => {
    if (!validation || !validation.valid || !validation.events) {
      return
    }
    
    setImporting(true)
    
    try {
      // 转换为本地格式
      const newEvents = validation.events.map(e => transformToCalendarEvent(e))
      
      // 解析冲突 - 跳过重复日程
      const filteredEvents = resolveConflicts(newEvents, existingEvents)
      
      // 计算统计
      const imported = filteredEvents.length
      const skipped = newEvents.length - filteredEvents.length
      
      // 执行导入
      onImport(filteredEvents, syncToFeishu)
      
      // 显示结果
      let message = `导入完成！\n成功导入：${imported} 条日程`
      if (skipped > 0) {
        message += `\n跳过重复：${skipped} 条`
      }
      
      if (validation.warnings.length > 0) {
        message += '\n\n警告：\n' + validation.warnings.slice(0, 5).join('\n')
        if (validation.warnings.length > 5) {
          message += `\n... 还有 ${validation.warnings.length - 5} 条警告`
        }
      }
      
      alert(message)
      
      // 关闭弹窗
      setMode('select')
      setFileContent(null)
      setFileName('')
      setValidation(null)
    } catch (err: any) {
      setError('导入失败：' + (err.message || '未知错误'))
    } finally {
      setImporting(false)
    }
  }
  
  // 执行导出
  const handleExportClick = async () => {
    if (!startDate || !endDate) {
      alert('请选择导出日期范围')
      return
    }
    
    if (startDate > endDate) {
      alert('开始日期不能大于结束日期')
      return
    }
    
    setExporting(true)
    
    try {
      // 调用父组件的导出函数
      onExport(startDate, endDate)
      
      // 关闭弹窗
      setMode('select')
    } catch (err: any) {
      setError('导出失败：' + (err.message || '未知错误'))
    } finally {
      setExporting(false)
    }
  }
  
  // 返回选择模式
  const handleBackToSelect = () => {
    setMode('select')
    setFileContent(null)
    setFileName('')
    setValidation(null)
    setError(null)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">
            {mode === 'select' && '📁 数据管理'}
            {mode === 'import' && '📥 导入数据'}
            {mode === 'export' && '📤 导出数据'}
          </h2>
          
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* 选择模式 */}
          {mode === 'select' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 导入按钮 */}
                <button
                  onClick={() => {
                    setMode('import')
                    handleSelectFile()
                  }}
                  className="p-6 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg transition-colors"
                >
                  <div className="text-4xl mb-2">📥</div>
                  <div className="text-lg font-bold text-blue-700 mb-1">导入数据</div>
                  <div className="text-sm text-blue-600">从 JSON 文件导入日程</div>
                </button>
                
                {/* 导出按钮 */}
                <button
                  onClick={() => setMode('export')}
                  className="p-6 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors"
                >
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-lg font-bold text-green-700 mb-1">导出数据</div>
                  <div className="text-sm text-green-600">导出日程到 JSON 文件</div>
                </button>
              </div>
              
              {/* 统计信息 */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div className="font-medium mb-2">📊 当前统计</div>
                  <div>• 本地日程总数：{existingEvents.length} 条</div>
                </div>
              </div>
            </div>
          )}
          
          {/* 导入模式 */}
          {mode === 'import' && (
            <div className="space-y-4">
              {/* 文件选择 */}
              {!fileContent && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📁 选择文件
                  </label>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={handleSelectFile}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      disabled={importing}
                    >
                      选择 JSON 文件...
                    </button>
                    {fileName && (
                      <span className="text-sm text-gray-600">{fileName}</span>
                    )}
                  </div>
                  
                  {/* 错误提示 */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}
                  
                  {/* 返回按钮 */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleBackToSelect}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      返回
                    </button>
                  </div>
                </div>
              )}
              
              {/* 文件信息 */}
              {validation && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">📊 文件信息</h3>
                  {validation.valid ? (
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>• 日程数量：{validation.totalEvents} 条</p>
                      {fileContent?.exportInfo?.exportedAt && (
                        <p>• 导出时间：{new Date(fileContent.exportInfo.exportedAt).toLocaleString()}</p>
                      )}
                      {fileContent?.exportInfo?.dateRange && (
                        <p>• 日期范围：{fileContent.exportInfo.dateRange.start} 至 {fileContent.exportInfo.dateRange.end}</p>
                      )}
                      {fileContent?.exportInfo?.withAttachments && (
                        <p>• 带附件：{fileContent.exportInfo.withAttachments} 条</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      <p className="font-medium mb-2">❌ 数据验证失败</p>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* 警告信息 */}
                  {validation.warnings.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm text-yellow-600 font-medium mb-1">⚠️ 警告：</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                        {validation.warnings.slice(0, 5).map((warn, idx) => (
                          <li key={idx}>{warn}</li>
                        ))}
                        {validation.warnings.length > 5 && (
                          <li>... 还有 {validation.warnings.length - 5} 条警告</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* 导入设置 */}
              {validation && validation.valid && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">⚙️ 导入设置</h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={syncToFeishu}
                        onChange={(e) => setSyncToFeishu(e.target.checked)}
                        className="mr-2"
                        disabled={importing}
                      />
                      <span className="text-sm text-gray-700">导入后同步到飞书</span>
                    </label>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>ℹ️ 导入模式：增量导入（合并现有数据）</p>
                      <p>ℹ️ 重复日程：自动跳过</p>
                      <p>ℹ️ 缺少时间：自动使用 09:00</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 导入按钮 */}
              {validation && validation.valid && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleBackToSelect}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    disabled={importing}
                  >
                    返回
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!validation?.valid || importing}
                  >
                    {importing ? '导入中...' : `开始导入 (${validation.totalEvents} 条)`}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* 导出模式 */}
          {mode === 'export' && (
            <div className="space-y-4">
              {/* 日期范围选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 选择导出日期范围
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* 导出信息 */}
              {startDate && endDate && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-2">📊 导出预览</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>• 日期范围：{startDate} 至 {endDate}</p>
                      <p>• 预计导出：计算中...</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 导出按钮 */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleBackToSelect}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  disabled={exporting}
                >
                  返回
                </button>
                <button
                  onClick={handleExportClick}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!startDate || !endDate || exporting}
                >
                  {exporting ? '导出中...' : '开始导出'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部关闭按钮（仅在选择模式显示） */}
        {mode === 'select' && (
          <div className="flex justify-end px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
