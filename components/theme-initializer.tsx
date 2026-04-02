'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

const LIGHT_THEME_COLOR = '#f7efe1'
const DARK_THEME_COLOR = '#141110'

export function ThemeInitializer() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const nextTheme = resolvedTheme === 'dark' ? 'dark' : 'light'
    const themeColor =
      nextTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR

    document.documentElement.style.colorScheme = nextTheme

    let themeMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeMeta) {
      themeMeta = document.createElement('meta')
      themeMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(themeMeta)
    }
    themeMeta.setAttribute('content', themeColor)
  }, [resolvedTheme])

  return null
}
