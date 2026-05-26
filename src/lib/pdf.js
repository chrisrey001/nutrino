import html2pdf from 'html2pdf.js'
import { formatDate, formatShortDate, sumMacros, generateDailyNote, generateWeeklyNote, getMealMeta } from './utils'

// --- Utilities ---

async function imageUrlToBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function buildImageCache(mealsByDate) {
  const cache = {}
  for (const meals of Object.values(mealsByDate)) {
    for (const meal of meals) {
      if (meal.image_url && !cache[meal.image_url]) {
        cache[meal.image_url] = await imageUrlToBase64(meal.image_url)
      }
    }
  }
  return cache
}

function macroBar(eaten, goal, color) {
  const pct = Math.min(100, goal > 0 ? Math.round((eaten / goal) * 100) : 0)
  return `
    <div style="display:flex;align-items:center;gap:8px;margin:2px 0;">
      <div style="width:80px;height:6px;background:#e5e7eb;border-radius:9999px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:9999px;"></div>
      </div>
      <span style="font-size:11px;color:#6b7280;">${pct}%</span>
    </div>`
}

function dayLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-US', { weekday: 'short' })
    .charAt(0)
}

// --- SVG Chart Functions ---
// All attributes hyphenated, absolute pixel width/height for html2canvas compatibility.

function donutChartSVG(avgCarbs, avgProtein, avgFats) {
  const carbsCal = avgCarbs * 4
  const protCal = avgProtein * 4
  const fatsCal = avgFats * 9
  const total = carbsCal + protCal + fatsCal
  const r = 42, cx = 60, cy = 60, sw = 14
  const circ = 2 * Math.PI * r
  const gap = 2

  const bg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f3f4f6" stroke-width="${sw}"/>`

  if (total === 0) {
    return `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      ${bg}
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" fill="#9ca3af">No data</text>
    </svg>`
  }

  const segs = [
    { pct: carbsCal / total, color: '#3b82f6' },
    { pct: protCal / total, color: '#8b5cf6' },
    { pct: fatsCal / total, color: '#f97316' },
  ]

  let cumPct = 0
  const circles = segs.map(seg => {
    const dashLen = Math.max(0, seg.pct * circ - gap).toFixed(2)
    const rotation = (cumPct * 360 - 90).toFixed(2)
    cumPct += seg.pct
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${seg.color}" stroke-width="${sw}"
      stroke-dasharray="${dashLen} ${circ.toFixed(2)}"
      transform="rotate(${rotation} ${cx} ${cy})"
      stroke-linecap="butt"/>`
  }).join('')

  return `<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    ${bg}${circles}
  </svg>`
}

function caloriesBarChartSVG(weekDates, mealsByDate, goal) {
  const W = 300, H = 110, pL = 8, pR = 8, pT = 10, pB = 24
  const plotW = W - pL - pR
  const plotH = H - pT - pB
  const dailyCals = weekDates.map(d => sumMacros(mealsByDate[d] || []).calories)
  const maxCal = Math.max(...dailyCals, goal, 1) * 1.15
  const slotW = plotW / 7
  const barW = slotW * 0.6
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => Math.max(2, (v / maxCal) * plotH)
  const goalY = (pT + plotH - (goal / maxCal) * plotH).toFixed(1)

  const bars = dailyCals.map((c, i) => {
    const h = barH(c)
    const x = toX(i)
    const y = pT + plotH - h
    const pct = goal > 0 ? c / goal : 0
    const fill = c === 0 ? '#f3f4f6' : pct > 1.25 ? '#ef4444' : pct > 1.1 ? '#f59e0b' : '#22c55e'
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}"/>
    <text x="${(x + barW / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="#9ca3af">${dayLabel(weekDates[i])}</text>`
  }).join('')

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${pL}" y1="${goalY}" x2="${W - pR}" y2="${goalY}" stroke="#9ca3af" stroke-width="1" stroke-dasharray="3,2"/>
    ${bars}
  </svg>`
}

function macroDailyChartSVG(weekDates, mealsByDate, macroKey, goalG, color) {
  const W = 300, H = 100, pL = 8, pR = 8, pT = 10, pB = 24
  const plotW = W - pL - pR
  const plotH = H - pT - pB
  const dailyVals = weekDates.map(d => sumMacros(mealsByDate[d] || [])[macroKey] || 0)
  const maxVal = Math.max(...dailyVals, goalG, 1) * 1.18
  const slotW = plotW / 7
  const barW = slotW * 0.6
  const toX = i => pL + i * slotW + (slotW - barW) / 2
  const barH = v => Math.max(2, (v / maxVal) * plotH)
  const goalY = (pT + plotH - (goalG / maxVal) * plotH).toFixed(1)

  const bars = dailyVals.map((v, i) => {
    const h = barH(v)
    const x = toX(i)
    const y = pT + plotH - h
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${v > 0 ? color : '#f3f4f6'}" opacity="${v > 0 ? '0.85' : '1'}"/>
    <text x="${(x + barW / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="9" fill="#9ca3af">${dayLabel(weekDates[i])}</text>`
  }).join('')

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${pL}" y1="${goalY}" x2="${W - pR}" y2="${goalY}" stroke="${color}" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.5"/>
    ${bars}
  </svg>`
}

function budgetLineChartSVG(weekDates, mealsByDate, goal) {
  const W = 300, H = 120, pL = 36, pR = 10, pT = 12, pB = 28
  const plotW = W - pL - pR
  const plotH = H - pT - pB
  const dailyCals = weekDates.map(d => sumMacros(mealsByDate[d] || []).calories)
  const maxCal = Math.max(...dailyCals, goal, 1) * 1.18
  const toX = i => pL + (i / 6) * plotW
  const toY = v => pT + plotH - (v / maxCal) * plotH
  const goalY = toY(goal).toFixed(1)
  const yTicks = [0, Math.round(goal / 2), goal]
  const points = dailyCals.map((c, i) => `${toX(i).toFixed(1)},${toY(c).toFixed(1)}`).join(' ')

  const ticks = yTicks.map(v => `
    <line x1="${pL}" y1="${toY(v).toFixed(1)}" x2="${W - pR}" y2="${toY(v).toFixed(1)}" stroke="#f3f4f6" stroke-width="1"/>
    <text x="${pL - 3}" y="${(toY(v) + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#d1d5db">${v}</text>`).join('')

  const dots = dailyCals.map((c, i) => `<circle cx="${toX(i).toFixed(1)}" cy="${toY(c).toFixed(1)}" r="3.5"
    fill="${c > 0 ? '#f97316' : 'white'}" stroke="${c > 0 ? '#f97316' : '#e5e7eb'}" stroke-width="1.5"/>`).join('')

  const labels = weekDates.map((d, i) => `<text x="${toX(i).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#9ca3af">${dayLabel(d)}</text>`).join('')

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${ticks}
    <line x1="${pL}" y1="${goalY}" x2="${W - pR}" y2="${goalY}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.7"/>
    <polyline points="${points}" fill="none" stroke="#f97316" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${labels}
  </svg>`
}

// --- HTML Section Builders ---

function buildHeaderHTML(weekStart, weekEnd, profile) {
  return `
    <div style="background:#16a34a;padding:20px 24px;margin:-24px -24px 24px -24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="color:#16a34a;font-weight:900;font-size:20px;line-height:1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">N</span>
          </div>
          <div>
            <div style="color:white;font-weight:700;font-size:20px;line-height:1.1;">utrino</div>
            <div style="color:#bbf7d0;font-size:11px;margin-top:1px;">Weekly Nutrition Report</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="color:white;font-size:13px;font-weight:600;">${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}</div>
          ${profile.name ? `<div style="color:#bbf7d0;font-size:11px;margin-top:2px;">Patient: ${profile.name}</div>` : ''}
          ${profile.dietician_name ? `<div style="color:#bbf7d0;font-size:11px;">Dietician: ${profile.dietician_name}</div>` : ''}
          <div style="color:#86efac;font-size:10px;margin-top:3px;">Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>
    </div>`
}

function buildStatBoxesHTML(daysWithMeals, avgCal, goals) {
  const adherence = daysWithMeals > 0 ? Math.round((avgCal / goals.calorie_goal) * 100) : 0
  const adherenceColor = adherence < 90 ? '#ef4444' : adherence > 110 ? '#f59e0b' : '#22c55e'
  const boxes = [
    { label: 'Days Logged', value: `${daysWithMeals}/7`, sub: 'days this week' },
    { label: 'Avg Calories', value: avgCal.toLocaleString(), sub: 'kcal/day' },
    { label: 'Calorie Goal', value: goals.calorie_goal.toLocaleString(), sub: 'kcal/day' },
    { label: 'Adherence', value: `${adherence}%`, sub: 'of goal', color: adherenceColor },
  ]
  return `
    <div style="display:flex;gap:10px;margin-bottom:20px;">
      ${boxes.map(b => `
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:12px 8px;text-align:center;border:1px solid #e5e7eb;">
          <div style="font-size:18px;font-weight:700;color:${b.color || '#111827'};">${b.value}</div>
          <div style="font-size:10px;font-weight:600;color:#374151;margin-top:2px;">${b.label}</div>
          <div style="font-size:10px;color:#9ca3af;">${b.sub}</div>
        </div>`).join('')}
    </div>`
}

function legendRow(color, label, pct, avgG) {
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
      <div style="flex:1;font-size:11px;color:#6b7280;">${label}</div>
      <div style="font-size:11px;font-weight:700;color:${color};">${pct}%</div>
      <div style="font-size:10px;color:#9ca3af;min-width:28px;text-align:right;">${avgG}g</div>
    </div>`
}

function buildChartsRowHTML(weekDates, mealsByDate, avgCarbs, avgProtein, avgFats, carbsPct, protPct, fatPct, goals) {
  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:12px;">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;">Macro Balance</div>
          <div style="display:flex;align-items:center;gap:12px;">
            ${donutChartSVG(avgCarbs, avgProtein, avgFats)}
            <div style="flex:1;">
              ${legendRow('#3b82f6', 'Carbs', carbsPct, avgCarbs)}
              ${legendRow('#8b5cf6', 'Protein', protPct, avgProtein)}
              ${legendRow('#f97316', 'Fat', fatPct, avgFats)}
            </div>
          </div>
        </td>
        <td style="width:50%;vertical-align:top;padding-left:12px;">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px;">Daily Calorie Trend</div>
          <div style="font-size:10px;color:#9ca3af;margin-bottom:6px;">
            <span style="display:inline-block;width:12px;height:2px;background:#3b82f6;vertical-align:middle;margin-right:3px;border-top:1px dashed #3b82f6;"></span>Goal &nbsp;
            <span style="display:inline-block;width:12px;height:2px;background:#f97316;vertical-align:middle;margin-right:3px;"></span>Eaten
          </div>
          ${budgetLineChartSVG(weekDates, mealsByDate, goals.calorie_goal)}
        </td>
      </tr>
    </table>`
}

function buildWeeklyAnalysisHTML(weekNote) {
  if (!weekNote) return ''
  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#166534;line-height:1.6;">
      <strong>Weekly Analysis:</strong> ${weekNote}
    </div>`
}

function macroRow(label, avg, goal, color) {
  const pct = goal > 0 ? Math.round((avg / goal) * 100) : 0
  const pctColor = pct < 80 ? '#ef4444' : pct > 120 ? '#f59e0b' : '#22c55e'
  return `
    <tr>
      <td style="padding:8px;font-weight:600;font-size:12px;color:${color};">${label}</td>
      <td style="padding:8px;">${macroBar(avg, goal, color)}</td>
      <td style="padding:8px;text-align:center;font-size:12px;color:#374151;font-weight:600;">${avg}g</td>
      <td style="padding:8px;text-align:center;font-size:12px;color:#9ca3af;">${goal}g</td>
      <td style="padding:8px;text-align:center;font-size:12px;font-weight:700;color:${pctColor};">${pct}%</td>
    </tr>`
}

function buildMacroTargetsTableHTML(avgCarbs, avgProtein, avgFats, goals) {
  return `
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em;">Macro Targets</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:7px 8px;text-align:left;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Macro</th>
            <th style="padding:7px 8px;text-align:left;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Progress</th>
            <th style="padding:7px 8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Avg/day</th>
            <th style="padding:7px 8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Goal</th>
            <th style="padding:7px 8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">% Target</th>
          </tr>
        </thead>
        <tbody>
          ${macroRow('Carbs', avgCarbs, goals.carbs_goal_g, '#3b82f6')}
          ${macroRow('Protein', avgProtein, goals.protein_goal_g, '#8b5cf6')}
          ${macroRow('Fat', avgFats, goals.fats_goal_g, '#f97316')}
        </tbody>
      </table>
    </div>`
}

async function buildDailySectionHTML(date, meals, goals, imageCache) {
  if (meals.length === 0) return ''
  const t = sumMacros(meals)
  const dayNote = generateDailyNote(t, goals)
  const dayLabelFull = formatDate(date)

  const mealRows = (await Promise.all(meals.map(async meal => {
    const meta = getMealMeta(meal.meal_type)
    const imgSrc = imageCache[meal.image_url]
    const imgTag = imgSrc
      ? `<img src="${imgSrc}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;margin-right:10px;flex-shrink:0;" />`
      : `<div style="width:72px;height:72px;background:#f0fdf4;border-radius:6px;margin-right:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;">${meta.emoji}</div>`

    const itemRows = (meal.items || []).map(item => `
      <tr>
        <td style="padding:4px 6px;color:#374151;">${item.name}${item.estimated_portion ? ` <span style="color:#9ca3af;">(${item.estimated_portion})</span>` : ''}</td>
        <td style="padding:4px 6px;text-align:center;">${item.calories || 0}</td>
        <td style="padding:4px 6px;text-align:center;">${item.carbs_g ? Math.round(item.carbs_g) : 0}g</td>
        <td style="padding:4px 6px;text-align:center;">${item.protein_g ? Math.round(item.protein_g) : 0}g</td>
        <td style="padding:4px 6px;text-align:center;">${item.fats_g ? Math.round(item.fats_g) : 0}g</td>
      </tr>`).join('')

    return `
      <div style="margin-bottom:14px;page-break-inside:avoid;">
        <div style="display:inline-block;background:#f0fdf4;color:#16a34a;border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:600;margin-bottom:6px;">${meta.emoji} ${meta.label}</div>
        <div style="display:flex;align-items:flex-start;margin-bottom:6px;">
          ${imgTag}
          <div style="flex:1;">
            <div style="font-size:13px;color:#374151;margin-bottom:3px;">${meal.description || ''}</div>
            <div style="font-size:11px;color:#6b7280;">
              ${meal.calories} kcal &nbsp;·&nbsp; ${Math.round(meal.carbs_g || 0)}g carbs &nbsp;·&nbsp; ${Math.round(meal.protein_g || 0)}g protein &nbsp;·&nbsp; ${Math.round(meal.fats_g || 0)}g fat
            </div>
          </div>
        </div>
        ${itemRows ? `
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:3px 6px;text-align:left;color:#6b7280;font-weight:500;">Item</th>
              <th style="padding:3px 6px;text-align:center;color:#6b7280;font-weight:500;">Cal</th>
              <th style="padding:3px 6px;text-align:center;color:#6b7280;font-weight:500;">Carbs</th>
              <th style="padding:3px 6px;text-align:center;color:#6b7280;font-weight:500;">Protein</th>
              <th style="padding:3px 6px;text-align:center;color:#6b7280;font-weight:500;">Fat</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="border-top:1px solid #e5e7eb;font-weight:600;">
              <td style="padding:3px 6px;">Total</td>
              <td style="padding:3px 6px;text-align:center;">${meal.calories}</td>
              <td style="padding:3px 6px;text-align:center;">${Math.round(meal.carbs_g || 0)}g</td>
              <td style="padding:3px 6px;text-align:center;">${Math.round(meal.protein_g || 0)}g</td>
              <td style="padding:3px 6px;text-align:center;">${Math.round(meal.fats_g || 0)}g</td>
            </tr>
          </tfoot>
        </table>` : ''}
      </div>`
  }))).join('')

  return `
    <div style="margin-top:20px;page-break-inside:avoid;">
      <div style="border-left:4px solid #16a34a;padding-left:10px;margin-bottom:10px;">
        <div style="font-size:15px;font-weight:700;color:#111827;">${dayLabelFull}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">
          ${t.calories} kcal &nbsp;·&nbsp; ${Math.round(t.carbs_g)}g carbs &nbsp;·&nbsp; ${Math.round(t.protein_g)}g protein &nbsp;·&nbsp; ${Math.round(t.fats_g)}g fat
        </div>
        ${dayNote ? `<div style="font-size:11px;color:#374151;margin-top:3px;font-style:italic;">${dayNote}</div>` : ''}
      </div>
      ${mealRows}
    </div>`
}

// --- Main Export ---

export async function generateWeeklyPDF(weekDates, mealsByDate, profile) {
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
  const macroCalsTotal = carbsCal + protCal + fatsCal
  const carbsPct = macroCalsTotal > 0 ? Math.round((carbsCal / macroCalsTotal) * 100) : 0
  const protPct = macroCalsTotal > 0 ? Math.round((protCal / macroCalsTotal) * 100) : 0
  const fatPct = macroCalsTotal > 0 ? Math.round((fatsCal / macroCalsTotal) * 100) : 0

  const weekNote = generateWeeklyNote(weekTotals, goals, daysWithMeals)
  const imageCache = await buildImageCache(mealsByDate)

  const dailySections = (await Promise.all(
    weekDates.map(date => buildDailySectionHTML(date, mealsByDate[date] || [], goals, imageCache))
  )).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;max-width:720px;margin:0 auto;padding:24px;background:white;">
      ${buildHeaderHTML(weekStart, weekEnd, profile)}
      ${buildStatBoxesHTML(daysWithMeals, avgCal, goals)}
      ${buildChartsRowHTML(weekDates, mealsByDate, avgCarbs, avgProtein, avgFats, carbsPct, protPct, fatPct, goals)}
      ${buildWeeklyAnalysisHTML(weekNote)}
      ${buildMacroTargetsTableHTML(avgCarbs, avgProtein, avgFats, goals)}
      <div style="page-break-before:always;"></div>
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:4px;">Daily Log</div>
      <div style="border-bottom:2px solid #16a34a;margin-bottom:4px;"></div>
      ${dailySections || '<div style="color:#9ca3af;font-size:13px;padding:20px 0;">No meals logged this week.</div>'}
    </div>`

  const el = document.createElement('div')
  el.innerHTML = html
  el.style.cssText = 'position:absolute;left:-9999px;top:0;background:white;'
  document.body.appendChild(el)

  const filename = `nutrino-week-${weekStart}.pdf`
  const worker = html2pdf().set({
    margin: [10, 10],
    filename,
    image: { type: 'jpeg', quality: 0.88 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el)

  let blob
  await worker.toPdf().get('pdf').then(function (pdf) {
    blob = pdf.output('blob')
  })

  document.body.removeChild(el)
  return { blob, filename }
}
