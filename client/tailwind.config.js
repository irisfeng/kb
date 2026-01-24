/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 启用基于 class 的 dark 模式
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'sans-serif'],
        serif: ['"Noto Serif SC"', 'serif'],
      },
      colors: {
        // 档案风格颜色
        primary: {
          50: '#fef7e8',
          100: '#fdecc6',
          200: '#fbd98f',
          300: '#f9c457',
          400: '#f7b332',
          500: '#c9a961', // Archive Gold
          600: '#d97706', // Amber-600
          700: '#b45309',
        },
        // 柔和的深色模式配色 (Zinc 色系 - 带 warmth 的灰色)
        dark: {
          bg: '#18181B',      // zinc-900 - 主背景
          card: '#27272A',    // zinc-800 - 卡片/容器
          border: '#3F3F46',  // zinc-700 - 边框/分隔线
          muted: '#71717A',   // zinc-500 - 次要文字
          text: '#FAFAFA',    // zinc-50 - 主要文字
          textSecondary: '#A1A1AA', // zinc-400 - 次要文字
        },
      },
      spacing: {
        '12': '12px',
        '14': '14px',
        '18': '18px',
        '22': '22px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
