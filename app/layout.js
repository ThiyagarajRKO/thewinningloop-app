export const metadata = {
  title: 'AdVault',
  description: 'Ad spy and product research over the Facebook Ad Library.',
};

// Runs before first paint so a returning dark-mode user never sees a flash of light.
// Explicit choice (localStorage) wins over the system preference, per the skill's
// runtime-toggle pattern.
const NO_FLASH = `(function(){try{
var s=localStorage.getItem('advault-theme');
var d=s?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.setAttribute('data-theme',d);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      {/* suppressHydrationWarning: browser extensions (ColorZilla, Grammarly,
          etc.) inject attributes like cz-shortcut-listen onto <body> before
          React hydrates. React flags that as a mismatch even though it's not
          a real one — this is Next's own documented fix for exactly that
          false positive, not a workaround for an actual bug here. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
