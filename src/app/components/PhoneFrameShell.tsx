import { type ReactNode, useEffect } from 'react';

export function PhoneFrameShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#FF6B35';
    document.body.style.margin = '0';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  return (
    <div
      className="min-h-screen flex items-start justify-center md:py-6 md:px-4"
      style={{ backgroundColor: '#FF6B35' }}
    >
      <div
        className="
          phone-frame
          relative w-full min-h-screen flex flex-col overflow-hidden
          md:min-h-0 md:w-[360px]
          md:rounded-[45px]
          md:border-[10px] md:border-[#1a1a1a]
        "
        style={{
          backgroundColor: '#ffffff',
          /* transform crea un containing block para position:fixed dentro del marco,
             de modo que el BottomNav fijo queda contenido en el teléfono en desktop */
          transform: 'translate(0, 0)',
        }}
      >
        {/* Notch */}
        <div
          className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 z-50"
          style={{ width: 110, height: 28, backgroundColor: '#1a1a1a', borderRadius: '0 0 18px 18px' }}
        />
        {/* Status bar */}
        <div className="hidden md:flex items-center justify-between px-6 pt-1.5 pb-0 h-8 flex-shrink-0 bg-white">
          <span className="text-[10px] font-semibold text-gray-400">9:41</span>
          <div className="w-20" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm border border-gray-300">
              <div className="w-1/2 h-full bg-gray-300" />
            </div>
          </div>
        </div>

        {/* Scrollable content area */}
        <div
          className="flex-1 overflow-y-auto phone-scroll"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {children}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .phone-frame {
            height: min(840px, 93vh);
            box-shadow: 0 0 0 2px #333, 0 30px 80px rgba(0,0,0,0.50), inset 0 0 0 1px #555;
          }
        }
        .phone-scroll::-webkit-scrollbar { display: none; }
        .phone-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
}
