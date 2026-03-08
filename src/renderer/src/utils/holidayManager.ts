import { HolidayData, HolidayInfo, DayType } from '../types/holiday'

/**
 * 节假日管理器
 * 负责加载、缓存和查询中国法定节假日信息
 */
class HolidayManager {
  private holidayData: HolidayData | null = null
  private holidayDates: Set<string> = new Set() // 所有放假日期
  private workdayDates: Set<string> = new Set() // 所有调休工作日
  private dateToHoliday: Map<string, string> = new Map() // 日期->节日名称

  /**
   * 加载节假日数据
   */
  async loadData(): Promise<void> {
    try {
      const response = await fetch('/holidayAPI.json')
      if (!response.ok) {
        throw new Error(`Failed to load holiday data: ${response.status}`)
      }
      
      const data: HolidayData = await response.json()
      this.holidayData = data
      this.processData()
      
      console.log('✅ 节假日数据加载成功:', {
        name: data.Name,
        version: data.Version,
        years: Object.keys(data.Years).sort().join(', ')
      })
    } catch (error) {
      console.error('❌ 加载节假日数据失败:', error)
      throw error
    }
  }

  /**
   * 处理节假日数据，构建查询索引
   */
  private processData(): void {
    if (!this.holidayData) return

    this.holidayDates.clear()
    this.workdayDates.clear()
    this.dateToHoliday.clear()

    // 遍历所有年份
    for (const [year, holidays] of Object.entries(this.holidayData.Years)) {
      // 处理每个节假日
      for (const holiday of holidays) {
        // 添加放假日期范围
        const datesInRange = this.getDateRange(holiday.StartDate, holiday.EndDate)
        for (const date of datesInRange) {
          this.holidayDates.add(date)
          this.dateToHoliday.set(date, holiday.Name)
        }

        // 添加调休工作日（如果有）
        if (holiday.CompDays && Array.isArray(holiday.CompDays)) {
          for (const compDay of holiday.CompDays) {
            this.workdayDates.add(compDay)
          }
        } else {
          // 调试：记录没有 compDays 的节假日
          console.log(`ℹ️ ${holiday.Name} (${holiday.StartDate}-${holiday.EndDate}) 没有调休日`)
        }
      }
    }

    console.log('📊 节假日数据统计:', {
      totalHolidayDates: this.holidayDates.size,
      totalWorkdayDates: this.workdayDates.size
    })
  }

  /**
   * 获取日期范围
   */
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    let current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      dates.push(this.formatDate(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 检查日期类型
   * @param dateStr 日期字符串（YYYY-MM-DD）
   */
  checkDate(dateStr: string): DayType {
    // 调休工作日优先级最高（即使是周末也要上班）
    if (this.workdayDates.has(dateStr)) {
      return {
        isHoliday: false,
        isWorkday: true
      }
    }

    // 法定节假日（即使是工作日也要休息）
    if (this.holidayDates.has(dateStr)) {
      return {
        isHoliday: true,
        isWorkday: false,
        holidayName: this.dateToHoliday.get(dateStr)
      }
    }

    // 正常日期
    return {
      isHoliday: false,
      isWorkday: false
    }
  }

  /**
   * 获取某年的所有节假日
   */
  getHolidays(year: number): HolidayInfo[] {
    if (!this.holidayData) return []
    return this.holidayData.Years[year.toString()] || []
  }

  /**
   * 获取某年的所有放假日期
   */
  getHolidayDates(year: number): string[] {
    const dates: string[] = []
    const yearStr = year.toString()
    
    for (const date of this.holidayDates) {
      if (date.startsWith(yearStr)) {
        dates.push(date)
      }
    }
    
    return dates.sort()
  }

  /**
   * 获取某年的所有调休工作日
   */
  getCompensatoryWorkdays(year: number): string[] {
    const dates: string[] = []
    const yearStr = year.toString()
    
    for (const date of this.workdayDates) {
      if (date.startsWith(yearStr)) {
        dates.push(date)
      }
    }
    
    return dates.sort()
  }

  /**
   * 获取数据版本信息
   */
  getVersionInfo(): { name: string; version: string; generated: string } | null {
    if (!this.holidayData) return null
    return {
      name: this.holidayData.Name,
      version: this.holidayData.Version,
      generated: this.holidayData.Generated
    }
  }

  /**
   * 获取支持的年份范围
   */
  getSupportedYears(): number[] {
    if (!this.holidayData) return []
    return Object.keys(this.holidayData.Years)
      .map(year => parseInt(year))
      .sort((a, b) => a - b)
  }

  /**
   * 检查数据是否已加载
   */
  isLoaded(): boolean {
    return this.holidayData !== null
  }
}

// 导出单例
export const holidayManager = new HolidayManager()
