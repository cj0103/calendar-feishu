/**
 * 节假日信息接口
 */
export interface HolidayInfo {
  /** 节日名称 */
  Name: string
  /** 开始日期（YYYY-MM-DD） */
  StartDate: string
  /** 结束日期（YYYY-MM-DD） */
  EndDate: string
  /** 放假天数 */
  Duration: number
  /** 调休工作日（需要补班的日期） */
  CompDays: string[]
  /** 相关说明 */
  Memo?: string
  /** 政府文件链接 */
  URL?: string
}

/**
 * 节假日数据结构
 */
export interface HolidayData {
  /** 数据名称 */
  Name: string
  /** 版本号 */
  Version: string
  /** 生成时间 */
  Generated: string
  /** 时区 */
  Timezone: string
  /** 作者 */
  Author: string
  /** 数据源 URL */
  URL: string
  /** 各年份的节假日数据 */
  Years: {
    [year: string]: HolidayInfo[]
  }
}

/**
 * 日期类型
 */
export interface DayType {
  /** 是否为法定节假日（需要休息） */
  isHoliday: boolean
  /** 是否为调休工作日（需要上班） */
  isWorkday: boolean
  /** 节日名称 */
  holidayName?: string
}
