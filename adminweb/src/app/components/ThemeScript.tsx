const THEME_SCRIPT = `
(function() {
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
      suppressHydrationWarning
    />
  );
}
