'use client';

export function WatermarkLogo() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-15 dark:opacity-5"
      style={{
        backgroundImage: 'url(/logo/newbackgroundlogo.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Empty container - background image fills it */}
    </div>
  );
}

export default WatermarkLogo;
