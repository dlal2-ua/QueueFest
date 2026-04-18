import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { OperatorBottomNav } from '../components/OperatorBottomNav';

export function OperatorLayout({ children }: { children: ReactNode }) {
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
        style={{ backgroundColor: '#FDF6EE', transform: 'translate(0, 0)' }}
      >
        {/* Notch — desktop only */}
        <div
          className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 z-50"
          style={{ width: 110, height: 28, backgroundColor: '#1a1a1a', borderRadius: '0 0 18px 18px' }}
        />

        {/* Status bar — desktop only */}
        <div
          className="hidden md:flex items-center justify-between px-6 pt-1.5 pb-0 h-8 flex-shrink-0"
          style={{ backgroundColor: '#FFF3E4' }}
        >
          <span className="text-[10px] font-semibold" style={{ color: '#C8956C' }}>9:41</span>
          <div className="w-20" />
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm border" style={{ borderColor: '#C8956C' }}>
              <div className="w-1/2 h-full" style={{ backgroundColor: '#C8956C' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden phone-scroll">
          {children}
        </div>

        <OperatorBottomNav />

        {/* Home indicator — desktop only */}
        <div
          className="hidden md:flex justify-center items-center py-1.5 flex-shrink-0"
          style={{ backgroundColor: '#FFF3E4' }}
        >
          <div className="w-24 h-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
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
