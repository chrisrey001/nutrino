import {
  IconSunrise, IconSun, IconToolsKitchen2,
  IconApple, IconMoon, IconMoonStars, IconToolsKitchen
} from '@tabler/icons-react'

const MEAL_ICONS = {
  breakfast:       <IconSunrise size={16} stroke={1.5} />,
  morning_snack:   <IconSun size={16} stroke={1.5} />,
  lunch:           <IconToolsKitchen2 size={16} stroke={1.5} />,
  afternoon_snack: <IconApple size={16} stroke={1.5} />,
  dinner:          <IconMoon size={16} stroke={1.5} />,
  evening_snack:   <IconMoonStars size={16} stroke={1.5} />,
  _default:        <IconToolsKitchen size={16} stroke={1.5} />,
}

export function getMealIcon(mealType, size = 16) {
  if (size !== 16) {
    const icons = {
      breakfast:       <IconSunrise size={size} stroke={1.5} />,
      morning_snack:   <IconSun size={size} stroke={1.5} />,
      lunch:           <IconToolsKitchen2 size={size} stroke={1.5} />,
      afternoon_snack: <IconApple size={size} stroke={1.5} />,
      dinner:          <IconMoon size={size} stroke={1.5} />,
      evening_snack:   <IconMoonStars size={size} stroke={1.5} />,
      _default:        <IconToolsKitchen size={size} stroke={1.5} />,
    }
    return icons[mealType] ?? icons._default
  }
  return MEAL_ICONS[mealType] ?? MEAL_ICONS._default
}
