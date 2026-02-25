/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        card: 'var(--card)',
        muted: 'var(--muted)',
        destructive: 'var(--destructive)',
        success: 'var(--success)',
        error: 'var(--error)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        popover: 'var(--popover)',
      },
      backgroundColor: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
};

