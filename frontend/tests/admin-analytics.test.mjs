import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activitySeries, adminCsv, inPeriod } from '../src/lib/adminAnalytics.ts'

test('admin date filters use calendar days and exclude invalid and future events', () => {
    const now = new Date(2026, 10, 1, 12)
    assert.equal(inPeriod(new Date(2026, 9, 26).toISOString(), '7', now), true)
    assert.equal(inPeriod(new Date(2026, 9, 25, 23, 59).toISOString(), '7', now), false)
    assert.equal(inPeriod(new Date(2026, 10, 1, 13).toISOString(), 'all', now), false)
    assert.equal(inPeriod('invalid', 'all', now), false)
})

test('admin activity chart fills missing days and separates successes from failures', () => {
    const now = new Date(2026, 10, 1, 12)
    const events = [true, false, true].map((success, index) => ({ success, created_at: new Date(2026, 10, index === 2 ? 2 : 1, 10).toISOString() }))
    const series = activitySeries(events, 7, now)
    assert.equal(series.length, 7)
    assert.deepEqual(series.slice(0, 6).map(day => day.success + day.failed), [0, 0, 0, 0, 0, 0])
    assert.equal(series[6].success, 1)
    assert.equal(series[6].failed, 1)
})

test('CSV export preserves text and prevents formula execution in spreadsheets', () => {
    const csv = adminCsv(['Message', 'Value'], [['=SUM(A1)', 'a,"b"\nc'], ['  +formula', 12], [null, false]])
    assert.ok(csv.startsWith('\uFEFF"Message","Value"\r\n'))
    assert.ok(csv.includes('"\'=SUM(A1)"'))
    assert.ok(csv.includes('"\'  +formula"'))
    assert.ok(csv.includes('"a,""b""\nc"'))
    assert.ok(csv.endsWith('"","false"'))
})
