import { jsPDF } from 'jspdf'
import { sumMacros, getMealMeta, formatDate, formatShortDate, generateDailyNote, generateWeeklyNote } from './utils'

// --- Why this is built by hand ---
// Every prior approach rendered the DOM and then tried to capture it:
// window.print() (blank in an iOS standalone PWA) and html2pdf/html2canvas
// (blank on iOS once the rendered area exceeds Safari's canvas size limit —
// this library was already removed once in git history for exactly that).
// Here we instead WRITE the PDF's bytes directly with jsPDF: text, shapes and
// embedded photos. There is no canvas and no print pipeline, so none of the
// iOS-specific blank-output failures can occur. The same code runs in Node,
// which is how this is verified before shipping.

// A4 portrait, millimetres.
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 12
const CONTENT_W = PAGE_W - MARGIN * 2 // 186mm

const C = {
  green: [22, 163, 74],
  greenLite: [240, 253, 244],
  greenText: [187, 247, 208],
  text: [17, 24, 39],
  body: [55, 65, 81],
  gray: [107, 114, 128],
  light: [156, 163, 175],
  rule: [229, 231, 235],
  rowbg: [249, 250, 251],
  white: [255, 255, 255],
  carb: [59, 130, 246],
  prot: [139, 92, 246],
  fat: [249, 115, 22],
  red: [239, 68, 68],
  amber: [245, 158, 11],
  ok: [34, 197, 94],
}

// Build the report as a jsPDF document. Pure rendering — no browser APIs — so it
// runs identically in the browser and in Node. `imageMap` maps a meal photo URL
// to { dataUrl, w, h }; pass {} (e.g. in Node) to skip photos.
export function buildReportDoc(weekDates, mealsByDate, profile, imageMap = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  let y = MARGIN

  const fill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const stroke = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const ink = (c) => doc.setTextColor(c[0], c[1], c[2])
  const ensure = (h) => { if (y + h > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN } }

  // --- Derived stats (mirrors the previous report) ---
  const goals = {
    calorie_goal: profile.calorie_goal || 2100,
    carbs_goal_g: profile.carbs_goal_g || 131,
    protein_goal_g: profile.protein_goal_g || 236,
    fats_goal_g: profile.fats_goal_g || 70,
  }
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const allMeals = weekDates.flatMap((d) => mealsByDate[d] || [])
  const weekTotals = sumMacros(allMeals)
  const daysWithMeals = weekDates.filter((d) => (mealsByDate[d] || []).length > 0).length
  const avg = (v) => (daysWithMeals > 0 ? Math.round(v / daysWithMeals) : 0)
  const avgCal = avg(weekTotals.calories)
  const avgCarbs = avg(weekTotals.carbs_g)
  const avgProtein = avg(weekTotals.protein_g)
  const avgFats = avg(weekTotals.fats_g)
  const macroTot = avgCarbs * 4 + avgProtein * 4 + avgFats * 9
  const carbsPct = macroTot ? Math.round((avgCarbs * 4 / macroTot) * 100) : 0
  const protPct = macroTot ? Math.round((avgProtein * 4 / macroTot) * 100) : 0
  const fatPct = macroTot ? Math.round((avgFats * 9 / macroTot) * 100) : 0

  // --- Header banner ---
  fill(C.green)
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 2, 2, 'F')
  ink(C.white)
  doc.setFont('helvetica', 'bold').setFontSize(20)
  doc.text('Nutrino', MARGIN + 6, y + 11)
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text('Weekly Nutrition Report', MARGIN + 6, y + 18)
  const rightX = PAGE_W - MARGIN - 6
  doc.setFontSize(10)
  doc.text(`${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`, rightX, y + 9, { align: 'right' })
  ink(C.greenText)
  doc.setFontSize(8)
  let infoY = y + 14.5
  if (profile.name) { doc.text(`Patient: ${profile.name}`, rightX, infoY, { align: 'right' }); infoY += 4 }
  if (profile.dietician_name) { doc.text(`Dietician: ${profile.dietician_name}`, rightX, infoY, { align: 'right' }) }
  y += 24 + 8

  // --- Stat boxes ---
  const adherence = daysWithMeals ? Math.round((avgCal / goals.calorie_goal) * 100) : 0
  const boxes = [
    { label: 'Days Logged', value: `${daysWithMeals}/7`, sub: 'this week' },
    { label: 'Avg Intake', value: `${avgCal}`, sub: 'kcal/day' },
    { label: 'Calorie Goal', value: `${goals.calorie_goal}`, sub: `${adherence}% adherence` },
  ]
  const gap = 4
  const bw = (CONTENT_W - gap * 2) / 3
  const bh = 20
  boxes.forEach((b, i) => {
    const bx = MARGIN + i * (bw + gap)
    fill(C.greenLite)
    doc.roundedRect(bx, y, bw, bh, 2, 2, 'F')
    ink(C.gray); doc.setFont('helvetica', 'normal').setFontSize(7.5)
    doc.text(b.label.toUpperCase(), bx + 4, y + 6)
    ink(C.green); doc.setFont('helvetica', 'bold').setFontSize(15)
    doc.text(b.value, bx + 4, y + 13)
    ink(C.light); doc.setFont('helvetica', 'normal').setFontSize(7.5)
    doc.text(b.sub, bx + 4, y + 18)
  })
  y += bh + 9

  const sectionTitle = (t) => {
    ensure(11)
    ink(C.gray); doc.setFont('helvetica', 'bold').setFontSize(9)
    doc.text(t.toUpperCase(), MARGIN, y)
    y += 2
    stroke(C.green); doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
    doc.setLineWidth(0.2)
    y += 5
  }

  // --- Average macro split (stacked bar + legend) ---
  sectionTitle('Average Macro Split')
  const barH = 7
  const segs = [
    { pct: carbsPct, c: C.carb, label: `Carbs ${avgCarbs}g` },
    { pct: protPct, c: C.prot, label: `Protein ${avgProtein}g` },
    { pct: fatPct, c: C.fat, label: `Fat ${avgFats}g` },
  ]
  if (macroTot === 0) {
    fill(C.rule); doc.roundedRect(MARGIN, y, CONTENT_W, barH, 1, 1, 'F')
  } else {
    let sx = MARGIN
    segs.forEach((s) => {
      const w = (CONTENT_W * s.pct) / 100
      if (w <= 0) return
      fill(s.c); doc.rect(sx, y, w, barH, 'F')
      sx += w
    })
  }
  y += barH + 6
  doc.setFont('helvetica', 'normal').setFontSize(8)
  let lx = MARGIN
  segs.forEach((s) => {
    const label = `${s.label} (${s.pct}%)`
    fill(s.c); doc.circle(lx + 1.3, y - 1, 1.3, 'F')
    ink(C.text); doc.text(label, lx + 4, y)
    lx += doc.getTextWidth(label) + 12
  })
  y += 9

  // --- Daily calories (horizontal bars with a goal marker) ---
  sectionTitle('Daily Calories')
  const dailyCals = weekDates.map((d) => sumMacros(mealsByDate[d] || []).calories)
  const maxCal = Math.max(goals.calorie_goal, ...dailyCals, 1)
  const labelW = 12
  const valueW = 18
  const trackW = CONTENT_W - labelW - valueW
  weekDates.forEach((d, i) => {
    ensure(6)
    const cals = dailyCals[i]
    ink(C.gray); doc.setFont('helvetica', 'normal').setFontSize(8)
    doc.text(formatShortDate(d).split(',')[0], MARGIN, y + 3)
    const bx = MARGIN + labelW
    fill(C.rule); doc.roundedRect(bx, y, trackW, 4, 1, 1, 'F')
    if (cals > 0) {
      const over = cals > goals.calorie_goal * 1.1
      fill(over ? C.amber : C.green)
      doc.roundedRect(bx, y, Math.max(1, trackW * Math.min(1, cals / maxCal)), 4, 1, 1, 'F')
    }
    const gx = bx + trackW * Math.min(1, goals.calorie_goal / maxCal)
    stroke(C.gray); doc.setLineWidth(0.3); doc.line(gx, y - 0.6, gx, y + 4.6); doc.setLineWidth(0.2)
    ink(C.text); doc.text(`${cals}`, bx + trackW + 3, y + 3)
    y += 6
  })
  y += 5

  // --- Weekly analysis ---
  const weekNote = generateWeeklyNote(weekTotals, goals, daysWithMeals)
  if (weekNote) {
    sectionTitle('Weekly Analysis')
    ink(C.body); doc.setFont('helvetica', 'normal').setFontSize(9)
    const lines = doc.splitTextToSize(weekNote, CONTENT_W)
    ensure(lines.length * 4.6)
    doc.text(lines, MARGIN, y)
    y += lines.length * 4.6 + 7
  }

  // --- Macro targets table ---
  sectionTitle('Macro Targets')
  const cols = [34, 54, 30, 30, CONTENT_W - 148]
  const colX = cols.reduce((acc, w, i) => { acc.push((acc[i] ?? MARGIN) + (i === 0 ? 0 : cols[i - 1])); return acc }, [MARGIN])
  const heads = ['Macro', 'Progress', 'Avg/day', 'Goal', '% Target']
  const headAlign = ['left', 'left', 'center', 'center', 'center']
  const rowH = 8
  ensure(rowH)
  fill(C.rowbg); doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
  ink(C.gray); doc.setFont('helvetica', 'normal').setFontSize(8)
  heads.forEach((h, i) => {
    const cx = headAlign[i] === 'center' ? colX[i] + cols[i] / 2 : colX[i] + 3
    doc.text(h, cx, y + 5.4, { align: headAlign[i] })
  })
  y += rowH
  const macros = [
    { label: 'Carbs', avg: avgCarbs, goal: goals.carbs_goal_g, c: C.carb },
    { label: 'Protein', avg: avgProtein, goal: goals.protein_goal_g, c: C.prot },
    { label: 'Fat', avg: avgFats, goal: goals.fats_goal_g, c: C.fat },
  ]
  macros.forEach((m) => {
    ensure(rowH)
    const pct = m.goal > 0 ? Math.round((m.avg / m.goal) * 100) : 0
    const pctC = pct < 80 ? C.red : pct > 120 ? C.amber : C.ok
    ink(m.c); doc.setFont('helvetica', 'bold').setFontSize(8.5)
    doc.text(m.label, colX[0] + 3, y + 5.4)
    const pbw = cols[1] - 6
    fill(C.rule); doc.roundedRect(colX[1] + 3, y + 2.6, pbw, 3, 1, 1, 'F')
    fill(m.c); doc.roundedRect(colX[1] + 3, y + 2.6, pbw * Math.min(1, pct / 100), 3, 1, 1, 'F')
    ink(C.text); doc.setFont('helvetica', 'bold')
    doc.text(`${m.avg}g`, colX[2] + cols[2] / 2, y + 5.4, { align: 'center' })
    ink(C.gray); doc.setFont('helvetica', 'normal')
    doc.text(`${m.goal}g`, colX[3] + cols[3] / 2, y + 5.4, { align: 'center' })
    ink(pctC); doc.setFont('helvetica', 'bold')
    doc.text(`${pct}%`, colX[4] + cols[4] / 2, y + 5.4, { align: 'center' })
    stroke(C.rule); doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH)
    y += rowH
  })
  y += 8

  // --- Daily log (own page) ---
  doc.addPage(); y = MARGIN
  sectionTitle('Daily Log')
  const anyMeals = weekDates.some((d) => (mealsByDate[d] || []).length > 0)
  if (!anyMeals) {
    ink(C.light); doc.setFont('helvetica', 'normal').setFontSize(10)
    doc.text('No meals logged this week.', MARGIN, y + 4)
  } else {
    weekDates.forEach((d) => {
      const meals = mealsByDate[d] || []
      if (meals.length) drawDay(d, meals)
    })
  }

  function drawDay(date, meals) {
    const t = sumMacros(meals)
    const note = generateDailyNote(t, goals)
    ensure(20)
    const headTop = y
    ink(C.text); doc.setFont('helvetica', 'bold').setFontSize(11)
    doc.text(formatDate(date), MARGIN + 4, y + 4)
    ink(C.gray); doc.setFont('helvetica', 'normal').setFontSize(8.5)
    doc.text(`${t.calories} kcal  ·  ${Math.round(t.carbs_g)}g C  ·  ${Math.round(t.protein_g)}g P  ·  ${Math.round(t.fats_g)}g F`, MARGIN + 4, y + 9)
    let by = y + 11
    if (note) {
      ink(C.body); doc.setFont('helvetica', 'italic').setFontSize(8)
      const nl = doc.splitTextToSize(note, CONTENT_W - 4)
      doc.text(nl, MARGIN + 4, y + 13)
      by = y + 13 + nl.length * 4
    }
    // Green accent bar sized to the header block.
    fill(C.green); doc.rect(MARGIN, headTop, 1.4, by - headTop - 2, 'F')
    y = by + 4
    meals.forEach(drawMeal)
    y += 4
  }

  function drawMeal(meal) {
    const meta = getMealMeta(meal.meal_type)
    const img = imageMap[meal.image_url]
    const photo = 22
    ensure(photo + 12)
    // Meal-type chip.
    doc.setFont('helvetica', 'bold').setFontSize(7.5)
    const chipW = doc.getTextWidth(meta.label) + 8
    fill(C.greenLite); doc.roundedRect(MARGIN, y, chipW, 5, 2.5, 2.5, 'F')
    ink(C.green); doc.text(meta.label, MARGIN + 4, y + 3.4)
    y += 7
    // Photo (optional) + description + macro line.
    let textX = MARGIN
    if (img) {
      try {
        const ratio = img.h > 0 ? img.w / img.h : 1
        let dw = photo, dh = photo
        if (ratio > 1) dh = photo / ratio
        else dw = photo * ratio
        doc.addImage(img.dataUrl, MARGIN, y, dw, dh, undefined, 'FAST')
      } catch { /* skip unreadable image */ }
      textX = MARGIN + photo + 4
    }
    ink(C.body); doc.setFont('helvetica', 'normal').setFontSize(9)
    const descLines = meal.description ? doc.splitTextToSize(meal.description, MARGIN + CONTENT_W - textX) : []
    if (descLines.length) doc.text(descLines, textX, y + 3)
    ink(C.gray); doc.setFontSize(8)
    const macroLineY = y + 3 + descLines.length * 4 + 2
    doc.text(`${meal.calories} kcal  ·  ${Math.round(meal.carbs_g || 0)}g C  ·  ${Math.round(meal.protein_g || 0)}g P  ·  ${Math.round(meal.fats_g || 0)}g F`, textX, macroLineY)
    y = Math.max(img ? y + photo : 0, macroLineY) + 4
    drawItems(meal)
    y += 4
  }

  function drawItems(meal) {
    const items = meal.items || []
    if (!items.length) return
    const cw = 16
    const nameW = CONTENT_W - cw * 4
    const itemX = [MARGIN, MARGIN + nameW, MARGIN + nameW + cw, MARGIN + nameW + cw * 2, MARGIN + nameW + cw * 3]
    const rh = 4.8
    ensure(rh)
    fill(C.rowbg); doc.rect(MARGIN, y, CONTENT_W, rh, 'F')
    ink(C.gray); doc.setFont('helvetica', 'normal').setFontSize(7)
    doc.text('Item', itemX[0] + 2, y + 3.3)
    ;['Cal', 'C', 'P', 'F'].forEach((h, i) => doc.text(h, itemX[i + 1] + cw / 2, y + 3.3, { align: 'center' }))
    y += rh
    ink(C.body)
    items.forEach((it) => {
      ensure(rh)
      doc.setFont('helvetica', 'normal').setFontSize(7.5)
      const nm = it.name + (it.estimated_portion ? ` (${it.estimated_portion})` : '')
      doc.text(doc.splitTextToSize(nm, nameW - 4)[0], itemX[0] + 2, y + 3.3)
      const vals = [it.calories || 0, it.carbs_g ? Math.round(it.carbs_g) : 0, it.protein_g ? Math.round(it.protein_g) : 0, it.fats_g ? Math.round(it.fats_g) : 0]
      vals.forEach((v, i) => doc.text(`${v}`, itemX[i + 1] + cw / 2, y + 3.3, { align: 'center' }))
      y += rh
    })
    ensure(rh)
    stroke(C.rule); doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
    ink(C.text); doc.setFont('helvetica', 'bold').setFontSize(7.5)
    doc.text('Total', itemX[0] + 2, y + 3.4)
    const totals = [meal.calories, Math.round(meal.carbs_g || 0), Math.round(meal.protein_g || 0), Math.round(meal.fats_g || 0)]
    totals.forEach((v, i) => doc.text(`${v}`, itemX[i + 1] + cw / 2, y + 3.4, { align: 'center' }))
    y += rh
  }

  return doc
}

// Browser-only image loading. Meal photos are a hard requirement of this report,
// so this is deliberately robust:
//   1. Bytes are pulled through the authenticated Supabase client (download()),
//      NOT a raw cross-origin fetch of the public URL. <img> tags load
//      cross-origin images without CORS, but fetch() needs CORS headers — which
//      the public object endpoint often does not send, so the previous fetch()
//      silently failed and every photo was dropped. The SDK request carries the
//      apikey and goes through the storage API, which returns CORS headers.
//   2. Each photo is re-encoded via a small canvas to a baseline JPEG. The
//      source blob is same-origin (object URL), so the canvas is not tainted and
//      toDataURL() succeeds; this normalizes any camera format/orientation into
//      something jsPDF can always embed, and caps the size so the PDF stays small.
const STORAGE_BUCKET = 'meal-photos'

function storagePathFromUrl(url) {
  const marker = `/object/public/${STORAGE_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

async function fetchImageBlob(url) {
  try {
    const path = storagePathFromUrl(url)
    if (path) {
      const { supabase } = await import('./supabase')
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path)
      if (!error && data) return data
    }
  } catch { /* fall through to direct fetch */ }
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (res.ok) return await res.blob()
  } catch { /* give up on this image */ }
  return null
}

function blobToJpeg(blob, maxDim = 900, quality = 0.82) {
  return new Promise((resolve) => {
    const objUrl = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight || 1))
      const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale))
      const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale))
      try {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), w, h })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null) }
    img.src = objUrl
  })
}

async function loadImages(weekDates, mealsByDate) {
  const urls = [...new Set(
    weekDates.flatMap((d) => (mealsByDate[d] || []).map((m) => m.image_url).filter(Boolean))
  )]
  const map = {}
  await Promise.all(urls.map(async (url) => {
    const blob = await fetchImageBlob(url)
    if (!blob) return
    const processed = await blobToJpeg(blob)
    if (processed) map[url] = processed
  }))
  return map
}

// Generate the weekly report PDF and hand it to the OS. The PDF is built as real
// bytes (no canvas/print), then delivered via the native iOS share sheet
// (Save to Files / Mail / Messages / AirDrop) with a direct-download fallback.
export async function exportReport(weekDates, mealsByDate, profile) {
  const imageMap = await loadImages(weekDates, mealsByDate)
  const doc = buildReportDoc(weekDates, mealsByDate, profile, imageMap)
  const blob = doc.output('blob')
  // Timestamped filename: iOS Safari has a WebKit bug where repeatedly sharing a
  // file with the same name can produce a cached/blank payload.
  const filename = `nutrino-weekly-report-${Date.now()}.pdf`
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Nutrino Weekly Report' })
      return
    } catch (err) {
      if (err && err.name === 'AbortError') return // user dismissed the sheet
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
