import Utils from './Utils'

/**
 * DateTime Class to manipulate datetime values.
 *
 * @module DateTime
 **/

class DateTime {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.months31 = [1, 3, 5, 7, 8, 10, 12]
    this.months30 = [2, 4, 6, 9, 11]

    this.daysCntOfYear = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  }

  isValidDate(date) {
    if (typeof date === 'number') {
      return false // don't test for timestamps
    }
    return !isNaN(this.parseDate(date))
  }

  getTimeStamp(dateStr) {
    if (!Date.parse(dateStr)) {
      return dateStr
    }
    const utc = this.w.config.xaxis.labels.datetimeUTC
    return !utc
      ? new Date(dateStr).getTime()
      : new Date(new Date(dateStr).toISOString().substr(0, 25)).getTime()
  }

  getDate(timestamp) {
    const utc = this.w.config.xaxis.labels.datetimeUTC

    return utc
      ? new Date(new Date(timestamp).toUTCString())
      : new Date(timestamp)
  }

  parseDate(dateStr) {
    const parsed = Date.parse(dateStr)
    if (!isNaN(parsed)) {
      return this.getTimeStamp(dateStr)
    }

    let output = Date.parse(dateStr.replace(/-/g, '/').replace(/[a-z]+/gi, ' '))
    output = this.getTimeStamp(output)
    return output
  }

  // This fixes the difference of x-axis labels between chrome/safari
  // Fixes #1726, #1544, #1485, #1255
  parseDateWithTimezone(dateStr) {
    return Date.parse(dateStr.replace(/-/g, '/').replace(/[a-z]+/gi, ' '))
  }

  // http://stackoverflow.com/questions/14638018/current-time-formatting-with-javascript#answer-14638191
  formatDate(date, format) {
    const locale = this.w.globals.locale

    const utc = this.w.config.xaxis.labels.datetimeUTC

    let MMMM = ['\x00', ...locale.months]
    let MMM = ['\x01', ...locale.shortMonths]
    let dddd = ['\x02', ...locale.days]
    let ddd = ['\x03', ...locale.shortDays]

    function ii(i, len) {
      let s = i + ''
      len = len || 2
      while (s.length < len) s = '0' + s
      return s
    }

    let y = utc ? date.getUTCFullYear() : date.getFullYear()
    format = format.replace(/(^|[^\\])yyyy+/g, '$1' + y)
    format = format.replace(/(^|[^\\])yy/g, '$1' + y.toString().substr(2, 2))
    format = format.replace(/(^|[^\\])y/g, '$1' + y)

    let M = (utc ? date.getUTCMonth() : date.getMonth()) + 1
    format = format.replace(/(^|[^\\])MMMM+/g, '$1' + MMMM[0])
    format = format.replace(/(^|[^\\])MMM/g, '$1' + MMM[0])
    format = format.replace(/(^|[^\\])MM/g, '$1' + ii(M))
    format = format.replace(/(^|[^\\])M/g, '$1' + M)

    let d = utc ? date.getUTCDate() : date.getDate()
    format = format.replace(/(^|[^\\])dddd+/g, '$1' + dddd[0])
    format = format.replace(/(^|[^\\])ddd/g, '$1' + ddd[0])
    format = format.replace(/(^|[^\\])dd/g, '$1' + ii(d))
    format = format.replace(/(^|[^\\])d/g, '$1' + d)

    let H = utc ? date.getUTCHours() : date.getHours()
    format = format.replace(/(^|[^\\])HH+/g, '$1' + ii(H))
    format = format.replace(/(^|[^\\])H/g, '$1' + H)

    let h = H > 12 ? H - 12 : H === 0 ? 12 : H
    format = format.replace(/(^|[^\\])hh+/g, '$1' + ii(h))
    format = format.replace(/(^|[^\\])h/g, '$1' + h)

    let m = utc ? date.getUTCMinutes() : date.getMinutes()
    format = format.replace(/(^|[^\\])mm+/g, '$1' + ii(m))
    format = format.replace(/(^|[^\\])m/g, '$1' + m)

    let s = utc ? date.getUTCSeconds() : date.getSeconds()
    format = format.replace(/(^|[^\\])ss+/g, '$1' + ii(s))
    format = format.replace(/(^|[^\\])s/g, '$1' + s)

    let f = utc ? date.getUTCMilliseconds() : date.getMilliseconds()
    format = format.replace(/(^|[^\\])fff+/g, '$1' + ii(f, 3))
    f = Math.round(f / 10)
    format = format.replace(/(^|[^\\])ff/g, '$1' + ii(f))
    f = Math.round(f / 10)
    format = format.replace(/(^|[^\\])f/g, '$1' + f)

    let T = H < 12 ? 'AM' : 'PM'
    format = format.replace(/(^|[^\\])TT+/g, '$1' + T)
    format = format.replace(/(^|[^\\])T/g, '$1' + T.charAt(0))

    let t = T.toLowerCase()
    format = format.replace(/(^|[^\\])tt+/g, '$1' + t)
    format = format.replace(/(^|[^\\])t/g, '$1' + t.charAt(0))

    let tz = -date.getTimezoneOffset()
    let K = utc || !tz ? 'Z' : tz > 0 ? '+' : '-'

    if (!utc) {
      tz = Math.abs(tz)
      let tzHrs = Math.floor(tz / 60)
      let tzMin = tz % 60
      K += ii(tzHrs) + ':' + ii(tzMin)
    }

    format = format.replace(/(^|[^\\])K/g, '$1' + K)

    let day = (utc ? date.getUTCDay() : date.getDay()) + 1
    format = format.replace(new RegExp(dddd[0], 'g'), dddd[day])
    format = format.replace(new RegExp(ddd[0], 'g'), ddd[day])

    format = format.replace(new RegExp(MMMM[0], 'g'), MMMM[M])
    format = format.replace(new RegExp(MMM[0], 'g'), MMM[M])

    format = format.replace(/\\(.)/g, '$1')

    return format
  }

  getTimeUnitsfromTimestamp(minX, maxX, utc) {
    let w = this.w

    if (w.config.xaxis.min !== undefined) {
      minX = w.config.xaxis.min
    }
    if (w.config.xaxis.max !== undefined) {
      maxX = w.config.xaxis.max
    }

    const tsMin = this.getDate(minX)
    const tsMax = this.getDate(maxX)

    const minD = this.formatDate(tsMin, 'yyyy MM dd HH mm ss fff').split(' ')
    const maxD = this.formatDate(tsMax, 'yyyy MM dd HH mm ss fff').split(' ')

    return {
      minMillisecond: parseInt(minD[6], 10),
      maxMillisecond: parseInt(maxD[6], 10),
      minSecond: parseInt(minD[5], 10),
      maxSecond: parseInt(maxD[5], 10),
      minMinute: parseInt(minD[4], 10),
      maxMinute: parseInt(maxD[4], 10),
      minHour: parseInt(minD[3], 10),
      maxHour: parseInt(maxD[3], 10),
      minDate: parseInt(minD[2], 10),
      maxDate: parseInt(maxD[2], 10),
      minMonth: parseInt(minD[1], 10) - 1,
      maxMonth: parseInt(maxD[1], 10) - 1,
      minYear: parseInt(minD[0], 10),
      maxYear: parseInt(maxD[0], 10),
    }
  }

  isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  }

  calculcateLastDaysOfMonth(month, year, subtract) {
    const days = this.determineDaysOfMonths(month, year)

    // whatever days we get, subtract the number of days asked
    return days - subtract
  }

  determineDaysOfYear(year) {
    let days = 365

    if (this.isLeapYear(year)) {
      days = 366
    }

    return days
  }

  determineRemainingDaysOfYear(year, month, date) {
    let dayOfYear = this.daysCntOfYear[month] + date
    if (month > 1 && this.isLeapYear()) dayOfYear++
    return dayOfYear
  }

  determineDaysOfMonths(month, year) {
    let days = 30

    month = Utils.monthMod(month)

    switch (true) {
      case this.months30.indexOf(month) > -1:
        if (month === 2) {
          if (this.isLeapYear(year)) {
            days = 29
          } else {
            days = 28
          }
        }

        break

      case this.months31.indexOf(month) > -1:
        days = 31
        break

      default:
        days = 31
        break
    }

    return days
  }
}

export default DateTime
