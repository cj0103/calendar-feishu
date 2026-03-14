/**
 * 农历工具函数
 * 提供公历转农历、农历节日查询等功能
 */
import lunarCalendar from 'lunar-calendar'

/**
 * 农历月份中文映射
 */
const lunarMonths = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
]

/**
 * 农历日期中文映射
 */
const lunarDays = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
]

/**
 * 农历节日映射
 */
const lunarFestivals: { [key: string]: string } = {
  '1-1': '春节',
  '1-15': '元宵',
  '5-5': '端午',
  '7-7': '七夕',
  '8-15': '中秋',
  '9-9': '重阳'
}

/**
 * 农历信息接口
 */
export interface LunarInfo {
  /** 农历月份（1-12） */
  lunarMonth: number
  /** 农历日期（1-30） */
  lunarDay: number
  /** 农历字符串（如"正月初一"） */
  lunarStr: string
  /** 是否闰月 */
  isLeap: boolean
  /** 农历节日名称 */
  festival?: string
  /** 是否除夕 */
  isNewYearsEve?: boolean
}

/**
 * 获取农历信息
 * @param year 公历年份（1900-2100）
 * @param month 公历月份（1-12）
 * @param day 公历日期（1-31）
 * @returns 农历信息对象
 */
export function getLunarDate(year: number, month: number, day: number): LunarInfo {
  // 调用 lunar-calendar 库转换
  const result = lunarCalendar.solarToLunar(year, month, day)
  
  const lunarMonth = result.lunarMonth
  const lunarDay = result.lunarDay
  const isLeap = result.isLeap || false
  
  // 格式化农历字符串
  let lunarStr = ''
  let festival: string | undefined
  let isNewYearsEve = false
  
  // 检查是否为农历节日
  const festivalKey = `${lunarMonth}-${lunarDay}`
  if (lunarFestivals[festivalKey]) {
    festival = lunarFestivals[festivalKey]
    lunarStr = festival
  }
  // 检查是否为除夕（腊月最后一天）
  else if (lunarMonth === 12 && isLastDayOfLunarMonth(year, month, day)) {
    lunarStr = '除夕'
    isNewYearsEve = true
  }
  // 初一显示月份
  else if (lunarDay === 1) {
    lunarStr = lunarMonths[lunarMonth - 1]
  }
  // 其他日期显示农历日
  else {
    lunarStr = lunarDays[lunarDay - 1] || '初一'
  }
  
  return {
    lunarMonth,
    lunarDay,
    lunarStr,
    isLeap,
    festival,
    isNewYearsEve
  }
}

/**
 * 判断是否为农历月份的最后一天
 * @param year 公历年份
 * @param month 公历月份
 * @param day 公历日期
 * @returns 是否为农历月最后一天
 */
function isLastDayOfLunarMonth(year: number, month: number, day: number): boolean {
  // 检查下一天是否为新月份
  const nextDate = new Date(year, month - 1, day + 1)
  const nextResult = lunarCalendar.solarToLunar(
    nextDate.getFullYear(),
    nextDate.getMonth() + 1,
    nextDate.getDate()
  )
  
  // 如果下一天的农历日期是初一，说明今天是最后一天
  return nextResult.lunarDay === 1
}

/**
 * 格式化农历日期为中文
 * @param month 农历月份
 * @param day 农历日期
 * @returns 格式化后的字符串（如"正月初一"）
 */
export function formatLunarDate(month: number, day: number): string {
  const monthStr = lunarMonths[month - 1] || '正月'
  const dayStr = lunarDays[day - 1] || '初一'
  return `${monthStr}${dayStr}`
}

/**
 * 获取农历节日名称
 * @param month 农历月份
 * @param day 农历日期
 * @returns 节日名称（如"春节"），如果没有节日返回 null
 */
export function getLunarFestival(month: number, day: number): string | null {
  const key = `${month}-${day}`
  return lunarFestivals[key] || null
}

/**
 * 缓存对象，避免重复计算
 */
const lunarCache = new Map<string, LunarInfo>()

/**
 * 获取农历信息（带缓存）
 * @param date 日期对象
 * @returns 农历信息对象
 */
export function getLunarDateCached(date: Date): LunarInfo {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  
  if (lunarCache.has(key)) {
    return lunarCache.get(key)!
  }
  
  const lunar = getLunarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  )
  
  lunarCache.set(key, lunar)
  return lunar
}

/**
 * 清除缓存
 */
export function clearLunarCache(): void {
  lunarCache.clear()
}
