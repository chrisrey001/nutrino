import { formatDate, sumMacros, generateDailyNote, generateWeeklyNote, getMealMeta } from './utils'

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

export async function generateWeeklyPDF(weekDates, mealsByDate, profile) {
  const html2pdf = (await import('html2pdf.js')).default

  const goals = {
    calorie_goal: profile.calorie_goal || 2100,
    carbs_goal_g: profile.carbs_goal_g || 131,
    protein_goal_g: profile.protein_goal_g || 236,
    fats_goal_g: profile.fats_goal_g || 70
  }

  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  // Build weekly totals
  const allMeals = weekDates.flatMap(d => mealsByDate[d] || [])
  const weekTotals = sumMacros(allMeals)
  const daysWithMeals = weekDates.filter(d => (mealsByDate[d] || []).length > 0).length
  const weekNote = generateWeeklyNote(weekTotals, goals, daysWithMeals)

  // Preload all images as base64
  const imageCache = {}
  for (const meals of Object.values(mealsByDate)) {
    for (const meal of meals) {
      if (meal.image_url) {
        imageCache[meal.image_url] = await imageUrlToBase64(meal.image_url)
      }
    }
  }

  const weeklyTableRows = weekDates.map(date => {
    const meals = mealsByDate[date] || []
    const t = sumMacros(meals)
    const d = new Date(date + 'T12:00:00')
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const isToday = date === new Date().toISOString().split('T')[0]
    return `
      <tr style="${isToday ? 'background:#f0fdf4;' : ''}">
        <td style="padding:6px 8px;font-weight:${isToday ? '600' : '400'}">${label}</td>
        <td style="padding:6px 8px;text-align:center;">${t.calories || '—'}</td>
        <td style="padding:6px 8px;text-align:center;">${t.carbs_g ? Math.round(t.carbs_g) + 'g' : '—'}</td>
        <td style="padding:6px 8px;text-align:center;">${t.protein_g ? Math.round(t.protein_g) + 'g' : '—'}</td>
        <td style="padding:6px 8px;text-align:center;">${t.fats_g ? Math.round(t.fats_g) + 'g' : '—'}</td>
        <td style="padding:6px 8px;text-align:center;">${meals.length}</td>
      </tr>`
  }).join('')

  const avgCal = daysWithMeals > 0 ? Math.round(weekTotals.calories / daysWithMeals) : 0
  const avgCarbs = daysWithMeals > 0 ? Math.round(weekTotals.carbs_g / daysWithMeals) : 0
  const avgProt = daysWithMeals > 0 ? Math.round(weekTotals.protein_g / daysWithMeals) : 0
  const avgFats = daysWithMeals > 0 ? Math.round(weekTotals.fats_g / daysWithMeals) : 0

  const dailySections = (await Promise.all(weekDates.map(async date => {
    const meals = mealsByDate[date] || []
    if (meals.length === 0) return ''
    const t = sumMacros(meals)
    const dayNote = generateDailyNote(t, goals)
    const d = new Date(date + 'T12:00:00')
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    const mealRows = (await Promise.all(meals.map(async meal => {
      const meta = getMealMeta(meal.meal_type)
      const imgSrc = imageCache[meal.image_url]
      const imgTag = imgSrc
        ? `<img src="${imgSrc}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;margin-right:10px;flex-shrink:0;" />`
        : `<div style="width:72px;height:72px;background:#e5e7eb;border-radius:6px;margin-right:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:20px;">🍴</div>`

      const itemRows = (meal.items || []).map(item => `
        <tr>
          <td style="padding:4px 6px;color:#374151;">${item.name}${item.estimated_portion ? ` <span style="color:#9ca3af;">(${item.estimated_portion})</span>` : ''}</td>
          <td style="padding:4px 6px;text-align:center;">${item.calories || 0}</td>
          <td style="padding:4px 6px;text-align:center;">${item.carbs_g ? Math.round(item.carbs_g) : 0}g</td>
          <td style="padding:4px 6px;text-align:center;">${item.protein_g ? Math.round(item.protein_g) : 0}g</td>
          <td style="padding:4px 6px;text-align:center;">${item.fats_g ? Math.round(item.fats_g) : 0}g</td>
        </tr>`).join('')

      return `
        <div style="margin-bottom:16px;page-break-inside:avoid;">
          <div style="font-size:13px;font-weight:600;color:#16a34a;margin-bottom:6px;">${meta.emoji} ${meta.label}</div>
          <div style="display:flex;align-items:flex-start;margin-bottom:8px;">
            ${imgTag}
            <div style="flex:1;">
              <div style="font-size:13px;color:#374151;margin-bottom:4px;">${meal.description || ''}</div>
              <div style="font-size:12px;color:#6b7280;">
                ${meal.calories} kcal &nbsp;·&nbsp; ${Math.round(meal.carbs_g || 0)}g carbs &nbsp;·&nbsp; ${Math.round(meal.protein_g || 0)}g protein &nbsp;·&nbsp; ${Math.round(meal.fats_g || 0)}g fat
              </div>
            </div>
          </div>
          ${itemRows ? `
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:4px 6px;text-align:left;color:#6b7280;font-weight:500;">Item</th>
                <th style="padding:4px 6px;text-align:center;color:#6b7280;font-weight:500;">Cal</th>
                <th style="padding:4px 6px;text-align:center;color:#6b7280;font-weight:500;">Carbs</th>
                <th style="padding:4px 6px;text-align:center;color:#6b7280;font-weight:500;">Protein</th>
                <th style="padding:4px 6px;text-align:center;color:#6b7280;font-weight:500;">Fat</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr style="border-top:1px solid #e5e7eb;font-weight:600;">
                <td style="padding:4px 6px;">Total</td>
                <td style="padding:4px 6px;text-align:center;">${meal.calories}</td>
                <td style="padding:4px 6px;text-align:center;">${Math.round(meal.carbs_g || 0)}g</td>
                <td style="padding:4px 6px;text-align:center;">${Math.round(meal.protein_g || 0)}g</td>
                <td style="padding:4px 6px;text-align:center;">${Math.round(meal.fats_g || 0)}g</td>
              </tr>
            </tfoot>
          </table>` : ''}
        </div>`
    }))).join('')

    return `
      <div style="margin-top:24px;page-break-inside:avoid;">
        <div style="border-left:4px solid #16a34a;padding-left:10px;margin-bottom:10px;">
          <div style="font-size:15px;font-weight:700;color:#111827;">${dayLabel}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">
            ${t.calories} kcal &nbsp;·&nbsp; ${Math.round(t.carbs_g)}g carbs &nbsp;·&nbsp; ${Math.round(t.protein_g)}g protein &nbsp;·&nbsp; ${Math.round(t.fats_g)}g fat
            &nbsp;(goals: ${goals.calorie_goal} kcal / ${goals.carbs_goal_g}g C / ${goals.protein_goal_g}g P / ${goals.fats_goal_g}g F)
          </div>
          ${dayNote ? `<div style="font-size:12px;color:#374151;margin-top:4px;font-style:italic;">${dayNote}</div>` : ''}
        </div>
        ${mealRows}
      </div>`
  }))).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;max-width:720px;margin:0 auto;padding:24px;">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #16a34a;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#16a34a;">Nutrino</div>
          <div style="font-size:14px;color:#374151;margin-top:2px;">Weekly Report &nbsp;·&nbsp; ${formatDate(weekStart)} – ${formatDate(weekEnd)}</div>
          ${profile.name ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">Patient: ${profile.name}</div>` : ''}
          ${profile.dietician_name ? `<div style="font-size:13px;color:#6b7280;">Prepared for: ${profile.dietician_name}</div>` : ''}
        </div>
        <div style="text-align:right;font-size:12px;color:#9ca3af;">
          Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <!-- Weekly Summary -->
      <div style="margin-bottom:24px;">
        <div style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:10px;">Weekly Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px;text-align:left;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Day</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Calories</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Carbs</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Protein</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Fat</th>
              <th style="padding:8px;text-align:center;color:#6b7280;font-weight:500;border-bottom:1px solid #e5e7eb;">Meals</th>
            </tr>
          </thead>
          <tbody>${weeklyTableRows}</tbody>
          <tfoot>
            <tr style="border-top:2px solid #e5e7eb;background:#f9fafb;font-weight:600;">
              <td style="padding:8px;">7-Day Avg</td>
              <td style="padding:8px;text-align:center;">${avgCal}</td>
              <td style="padding:8px;text-align:center;">${avgCarbs}g</td>
              <td style="padding:8px;text-align:center;">${avgProt}g</td>
              <td style="padding:8px;text-align:center;">${avgFats}g</td>
              <td style="padding:8px;text-align:center;">${daysWithMeals > 0 ? Math.round(allMeals.length / daysWithMeals * 10) / 10 : 0}</td>
            </tr>
            <tr style="color:#6b7280;font-size:12px;">
              <td style="padding:4px 8px;">Goal</td>
              <td style="padding:4px 8px;text-align:center;">${goals.calorie_goal}</td>
              <td style="padding:4px 8px;text-align:center;">${goals.carbs_goal_g}g</td>
              <td style="padding:4px 8px;text-align:center;">${goals.protein_goal_g}g</td>
              <td style="padding:4px 8px;text-align:center;">${goals.fats_goal_g}g</td>
              <td style="padding:4px 8px;text-align:center;">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Weekly Analysis -->
      ${weekNote ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#166534;line-height:1.6;">
        <strong>Weekly Analysis:</strong> ${weekNote}
      </div>` : ''}

      <!-- Daily Sections -->
      ${dailySections}
    </div>`

  const el = document.createElement('div')
  el.innerHTML = html
  el.style.position = 'absolute'
  el.style.left = '-9999px'
  document.body.appendChild(el)

  const blob = await html2pdf().set({
    margin: [10, 10],
    filename: `nutrino-week-${weekStart}.pdf`,
    image: { type: 'jpeg', quality: 0.85 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(el).outputPdf('blob')

  document.body.removeChild(el)
  return { blob, filename: `nutrino-week-${weekStart}.pdf` }
}
