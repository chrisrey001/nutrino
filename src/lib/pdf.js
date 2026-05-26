import { jsPDF } from 'jspdf'
import { formatShortDate, formatDate, sumMacros, generateDailyNote, generateWeeklyNote, getMealMeta } from './utils'

const PAGE_W = 210
const PAGE_H = 297
const M = 10
const CW = PAGE_W - M * 2  // 190mm content width

// Draw a filled pie sector (for donut chart)
function drawSector(pdf, cx, cy, r, startDeg, endDeg, color) {
  if (endDeg - startDeg < 0.5) return
  const start = (startDeg - 90) * Math.PI / 180
  const end = (endDeg - 90) * Math.PI / 180
  const steps = Math.max(8, Math.round(Math.abs(endDeg - startDeg) / 5))

  pdf.setFillColor(...color)
  pdf.moveTo(cx, cy)
  for (let i = 0; i <= steps; i++) {
    const a = start + (end - start) * (i / steps)
    pdf.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  pdf.close()
  pdf.fill()
}

function drawDonutChart(pdf, cx, cy, outerR, innerR, carbs, protein, fats) {
  const carbsCal = carbs * 4
  const protCal = protein * 4
  const fatsCal = fats * 9
  const total = carbsCal + protCal + fatsCal

  if (total === 0) {
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(5)
    pdf.circle(cx, cy, (outerR + innerR) / 2, 'S')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(156, 163, 175)
    pdf.text('No data', cx, cy + 2, { align: 'center' })
    return
  }

  const segs = [
    { pct: carbsCal / total, color: [59, 130, 246] },
    { pct: protCal / total, color: [139, 92, 246] },
    { pct: fatsCal / total, color: [249, 115, 22] },
  ]

  let cumDeg = 0
  segs.forEach(seg => {
    const sweep = seg.pct * 360
    if (sweep > 0.5) {
      drawSector(pdf, cx, cy, outerR, cumDeg, cumDeg + sweep, seg.color)
    }
    cumDeg += sweep
  })

  // White center hole
  pdf.setFillColor(255, 255, 255)
  pdf.circle(cx, cy, innerR, 'F')
}

function drawCalorieBarChart(pdf, x, y, w, h, weekDates, mealsByDate, goal) {
  const dailyCals = weekDates.map(d => sumMacros(mealsByDate[d] || []).calories)
  const maxCal = Math.max(...dailyCals, goal, 1) * 1.15
  const slotW = w / 7
  const barW = slotW * 0.6
  const chartBottom = y + h

  // Goal dashed line
  const goalY = chartBottom - (goal / maxCal) * h
  pdf.setDrawColor(156, 163, 175)
  pdf.setLineWidth(0.4)
  pdf.setLineDashPattern([2, 1.5], 0)
  pdf.line(x, goalY, x + w, goalY)
  pdf.setLineDashPattern([], 0)

  dailyCals.forEach((cal, i) => {
    const bh = Math.max(0.5, (cal / maxCal) * h)
    const bx = x + i * slotW + (slotW - barW) / 2
    const by = chartBottom - bh
    const pct = goal > 0 ? cal / goal : 0
    const fill = cal === 0 ? [243, 244, 246] : pct > 1.25 ? [239, 68, 68] : pct > 1.1 ? [245, 158, 11] : [34, 197, 94]
    pdf.setFillColor(...fill)
    pdf.rect(bx, by, barW, bh, 'F')

    const dayLetter = new Date(weekDates[i] + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(156, 163, 175)
    pdf.text(dayLetter, bx + barW / 2, chartBottom + 4.5, { align: 'center' })
  })
}

export async function generateWeeklyPDF(weekDates, mealsByDate, profile) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const goals = {
    calorie_goal: profile.calorie_goal || 2100,
    carbs_goal_g: profile.carbs_goal_g || 131,
    protein_goal_g: profile.protein_goal_g || 236,
    fats_goal_g: profile.fats_goal_g || 70
  }

  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const allMeals = weekDates.flatMap(d => mealsByDate[d] || [])
  const weekTotals = sumMacros(allMeals)
  const daysWithMeals = weekDates.filter(d => (mealsByDate[d] || []).length > 0).length
  const avgCal = daysWithMeals > 0 ? Math.round(weekTotals.calories / daysWithMeals) : 0
  const avgCarbs = daysWithMeals > 0 ? Math.round(weekTotals.carbs_g / daysWithMeals) : 0
  const avgProtein = daysWithMeals > 0 ? Math.round(weekTotals.protein_g / daysWithMeals) : 0
  const avgFats = daysWithMeals > 0 ? Math.round(weekTotals.fats_g / daysWithMeals) : 0

  const carbsCal = avgCarbs * 4
  const protCal = avgProtein * 4
  const fatsCal = avgFats * 9
  const macroCalsTotal = Math.max(carbsCal + protCal + fatsCal, 1)
  const carbsPct = Math.round((carbsCal / macroCalsTotal) * 100)
  const protPct = Math.round((protCal / macroCalsTotal) * 100)
  const fatPct = 100 - carbsPct - protPct

  const adherence = goals.calorie_goal > 0 ? Math.round((avgCal / goals.calorie_goal) * 100) : 0
  const weekNote = generateWeeklyNote(weekTotals, goals, daysWithMeals)

  // ─── HEADER ───────────────────────────────────────────────────────────────
  let y = 0
  pdf.setFillColor(22, 163, 74)
  pdf.rect(0, 0, PAGE_W, 30, 'F')

  // N box (white)
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(M, 7, 15, 15, 2, 2, 'F')
  pdf.setTextColor(22, 163, 74)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('N', M + 7.5, 17.5, { align: 'center' })

  // utrino
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text('utrino', M + 18, 16)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(187, 247, 208)
  pdf.text('Weekly Nutrition Report', M + 18, 22)

  // Right side: week range, names, date
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(255, 255, 255)
  pdf.text(`${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`, PAGE_W - M, 13, { align: 'right' })

  let rightY = 18
  if (profile.name) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(187, 247, 208)
    pdf.text(`Patient: ${profile.name}`, PAGE_W - M, rightY, { align: 'right' })
    rightY += 4
  }
  if (profile.dietician_name) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(187, 247, 208)
    pdf.text(`Dietician: ${profile.dietician_name}`, PAGE_W - M, rightY, { align: 'right' })
    rightY += 4
  }
  pdf.setFontSize(7)
  pdf.setTextColor(134, 239, 172)
  pdf.text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, PAGE_W - M, rightY, { align: 'right' })

  // ─── STATS ROW ────────────────────────────────────────────────────────────
  y = 34
  const BOX_W = 45
  const BOX_H = 22
  const BOX_GAP = (CW - BOX_W * 4) / 3

  const statBoxes = [
    { value: `${daysWithMeals}/7`, label: 'Days Logged', sub: 'this week', color: [17, 24, 39] },
    { value: `${avgCal.toLocaleString()}`, label: 'Avg Calories', sub: 'kcal/day', color: [17, 24, 39] },
    { value: `${goals.calorie_goal.toLocaleString()}`, label: 'Calorie Goal', sub: 'kcal/day', color: [17, 24, 39] },
    {
      value: `${adherence}%`, label: 'Adherence', sub: 'vs target',
      color: adherence < 90 ? [239, 68, 68] : adherence > 110 ? [245, 158, 11] : [34, 197, 94]
    }
  ]

  statBoxes.forEach((box, i) => {
    const bx = M + i * (BOX_W + BOX_GAP)
    pdf.setFillColor(249, 250, 251)
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.rect(bx, y, BOX_W, BOX_H, 'FD')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(...box.color)
    pdf.text(box.value, bx + BOX_W / 2, y + 10, { align: 'center' })

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(55, 65, 81)
    pdf.text(box.label, bx + BOX_W / 2, y + 15, { align: 'center' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(156, 163, 175)
    pdf.text(box.sub, bx + BOX_W / 2, y + 19.5, { align: 'center' })
  })

  // ─── MACRO BALANCE (donut + legend) ───────────────────────────────────────
  y = 60

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(55, 65, 81)
  pdf.text('MACRO BALANCE', M, y)

  // Donut chart: left side
  const DONUT_CX = M + 20
  const DONUT_CY = y + 18
  drawDonutChart(pdf, DONUT_CX, DONUT_CY, 16, 9, avgCarbs, avgProtein, avgFats)

  // Center text in donut
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(55, 65, 81)
  pdf.text(`${avgCal}`, DONUT_CX, DONUT_CY - 1, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.5)
  pdf.setTextColor(156, 163, 175)
  pdf.text('kcal', DONUT_CX, DONUT_CY + 3, { align: 'center' })

  // Legend: right of donut
  const LEG_X = M + 42
  const macroSegs = [
    { label: 'Carbs', pct: carbsPct, avg: avgCarbs, color: [59, 130, 246] },
    { label: 'Protein', pct: protPct, avg: avgProtein, color: [139, 92, 246] },
    { label: 'Fat', pct: fatPct, avg: avgFats, color: [249, 115, 22] },
  ]
  macroSegs.forEach((seg, i) => {
    const ly = y + 6 + i * 11
    pdf.setFillColor(...seg.color)
    pdf.circle(LEG_X + 1.5, ly + 1.5, 1.5, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(55, 65, 81)
    pdf.text(seg.label, LEG_X + 5, ly + 3)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(156, 163, 175)
    pdf.text(`${seg.pct}% · ${seg.avg}g avg/day`, LEG_X + 5, ly + 8)
  })

  // Segmented bar below (right half of section)
  const BAR_X = M + 100
  const BAR_Y = y + 4
  const BAR_W = CW - 100
  const BAR_H = 8
  let barCursor = BAR_X
  macroSegs.forEach(seg => {
    const segW = Math.max(1, (seg.pct / 100) * BAR_W)
    pdf.setFillColor(...seg.color)
    pdf.rect(barCursor, BAR_Y, segW, BAR_H, 'F')
    barCursor += segW
  })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  pdf.setTextColor(55, 65, 81)
  pdf.text('DAILY CALORIES', BAR_X, y + 18)
  drawCalorieBarChart(pdf, BAR_X, y + 20, BAR_W, 22, weekDates, mealsByDate, goals.calorie_goal)

  y = DONUT_CY + 22

  // ─── WEEKLY ANALYSIS ──────────────────────────────────────────────────────
  if (weekNote) {
    const noteLines = pdf.splitTextToSize(`Weekly Analysis: ${weekNote}`, CW - 8)
    const noteH = noteLines.length * 4.5 + 7
    pdf.setFillColor(240, 253, 244)
    pdf.setDrawColor(187, 247, 208)
    pdf.setLineWidth(0.3)
    pdf.rect(M, y, CW, noteH, 'FD')

    // Green left accent bar
    pdf.setFillColor(22, 163, 74)
    pdf.rect(M, y, 2.5, noteH, 'F')

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(22, 101, 52)
    pdf.text(noteLines, M + 6, y + 5.5)
    y += noteH + 5
  }

  // ─── MACRO TARGETS TABLE ──────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(55, 65, 81)
  pdf.text('MACRO TARGETS', M, y)
  y += 4

  const tCols = [M, M + 28, M + 88, M + 118, M + 155]
  const tHeaders = ['Macro', 'Progress', 'Avg/day', 'Goal', '% Target']

  // Header row
  pdf.setFillColor(249, 250, 251)
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.3)
  pdf.rect(M, y, CW, 7, 'FD')
  tHeaders.forEach((h, i) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(107, 114, 128)
    pdf.text(h, tCols[i] + 1.5, y + 4.5)
  })
  y += 7

  const macroRows = [
    { label: 'Carbs', avg: avgCarbs, goal: goals.carbs_goal_g, color: [59, 130, 246] },
    { label: 'Protein', avg: avgProtein, goal: goals.protein_goal_g, color: [139, 92, 246] },
    { label: 'Fat', avg: avgFats, goal: goals.fats_goal_g, color: [249, 115, 22] },
  ]

  macroRows.forEach((row, ri) => {
    const rowY = y + ri * 9
    pdf.setFillColor(ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 251)
    pdf.setDrawColor(243, 244, 246)
    pdf.setLineWidth(0.2)
    pdf.rect(M, rowY, CW, 9, 'FD')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...row.color)
    pdf.text(row.label, tCols[0] + 1.5, rowY + 5.5)

    const barPct = Math.min(1, row.goal > 0 ? row.avg / row.goal : 0)
    const progressW = 58
    pdf.setFillColor(229, 231, 235)
    pdf.rect(tCols[1] + 1.5, rowY + 2.5, progressW, 4, 'F')
    pdf.setFillColor(...row.color)
    pdf.rect(tCols[1] + 1.5, rowY + 2.5, Math.max(0.5, barPct * progressW), 4, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(55, 65, 81)
    pdf.text(`${row.avg}g`, tCols[2] + 1.5, rowY + 5.5)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(156, 163, 175)
    pdf.text(`${row.goal}g`, tCols[3] + 1.5, rowY + 5.5)

    const pctV = row.goal > 0 ? Math.round((row.avg / row.goal) * 100) : 0
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...(pctV < 80 ? [239, 68, 68] : pctV > 120 ? [245, 158, 11] : [34, 197, 94]))
    pdf.text(`${pctV}%`, tCols[4] + 1.5, rowY + 5.5)
  })

  // ─── DAILY LOG (page 2+) ──────────────────────────────────────────────────
  pdf.addPage()
  y = M

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(107, 114, 128)
  pdf.text('DAILY LOG', M, y + 6)
  pdf.setFillColor(22, 163, 74)
  pdf.rect(M, y + 8, CW, 0.8, 'F')
  y += 14

  for (const date of weekDates) {
    const dayMeals = mealsByDate[date] || []
    if (dayMeals.length === 0) continue

    if (y > PAGE_H - 40) { pdf.addPage(); y = M }

    const dayTotals = sumMacros(dayMeals)
    const dayFull = formatDate(date)
    const dayNote = generateDailyNote(dayTotals, goals)

    // Day header
    pdf.setFillColor(240, 253, 244)
    pdf.setDrawColor(220, 252, 231)
    pdf.setLineWidth(0.2)
    pdf.rect(M + 3, y, CW - 3, 12, 'FD')
    pdf.setFillColor(22, 163, 74)
    pdf.rect(M, y, 3, 12, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(17, 24, 39)
    pdf.text(dayFull, M + 6, y + 5)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(107, 114, 128)
    pdf.text(
      `${dayTotals.calories} kcal · ${Math.round(dayTotals.carbs_g)}g carbs · ${Math.round(dayTotals.protein_g)}g protein · ${Math.round(dayTotals.fats_g)}g fat`,
      M + 6, y + 10
    )
    y += 14

    if (dayNote) {
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(7)
      pdf.setTextColor(107, 114, 128)
      pdf.text(dayNote, M + 5, y)
      y += 5
    }

    for (const meal of dayMeals) {
      if (y > PAGE_H - 25) { pdf.addPage(); y = M }

      const meta = getMealMeta(meal.meal_type)

      // Meal type pill
      pdf.setFillColor(240, 253, 244)
      pdf.setDrawColor(187, 247, 208)
      pdf.setLineWidth(0.2)
      const pillText = meta.label
      const pillW = pdf.getTextWidth(pillText) + 5
      pdf.roundedRect(M + 3, y, pillW, 5.5, 1.5, 1.5, 'FD')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(22, 101, 52)
      pdf.text(pillText, M + 5.5, y + 3.8)
      y += 7

      // Description
      if (meal.description) {
        const descLines = pdf.splitTextToSize(meal.description, CW - 10)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.5)
        pdf.setTextColor(55, 65, 81)
        pdf.text(descLines.slice(0, 2), M + 5, y)
        y += descLines.slice(0, 2).length * 4.5
      }

      // Macros line
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(156, 163, 175)
      pdf.text(
        `${meal.calories} kcal · ${Math.round(meal.carbs_g || 0)}g C · ${Math.round(meal.protein_g || 0)}g P · ${Math.round(meal.fats_g || 0)}g F`,
        M + 5, y + 1
      )
      y += 5

      // Items table
      if (meal.items && meal.items.length > 0) {
        const iTCols = [M + 5, M + 100, M + 122, M + 148, M + 170]
        const iTHeaders = ['Item', 'Cal', 'Carbs', 'Protein', 'Fat']

        pdf.setFillColor(249, 250, 251)
        pdf.setDrawColor(229, 231, 235)
        pdf.setLineWidth(0.2)
        pdf.rect(M + 5, y, CW - 5, 5.5, 'FD')
        iTHeaders.forEach((h, i) => {
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(6.5)
          pdf.setTextColor(107, 114, 128)
          pdf.text(h, iTCols[i] + 1, y + 3.8)
        })
        y += 5.5

        for (const item of meal.items) {
          if (y > PAGE_H - 15) { pdf.addPage(); y = M }

          pdf.setDrawColor(243, 244, 246)
          pdf.setLineWidth(0.2)
          pdf.line(M + 5, y + 5, PAGE_W - M, y + 5)

          const itemName = item.name + (item.estimated_portion ? ` (${item.estimated_portion})` : '')
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(7)
          pdf.setTextColor(55, 65, 81)
          pdf.text(pdf.splitTextToSize(itemName, 92)[0], iTCols[0] + 1, y + 3.5)

          pdf.setTextColor(107, 114, 128)
          pdf.text(String(item.calories || 0), iTCols[1] + 1, y + 3.5)
          pdf.text(`${Math.round(item.carbs_g || 0)}g`, iTCols[2] + 1, y + 3.5)
          pdf.text(`${Math.round(item.protein_g || 0)}g`, iTCols[3] + 1, y + 3.5)
          pdf.text(`${Math.round(item.fats_g || 0)}g`, iTCols[4] + 1, y + 3.5)
          y += 5
        }
        y += 2
      }
      y += 3
    }
    y += 5
  }

  if (daysWithMeals === 0) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(156, 163, 175)
    pdf.text('No meals logged this week.', M, y + 10)
  }

  const blob = pdf.output('blob')
  const filename = `nutrino-week-${weekStart}.pdf`
  return { blob, filename }
}
