import type { ReactNode } from 'react';
import { OperatorBottomNav } from '../components/OperatorBottomNav';

export function OperatorLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            {children}
            <OperatorBottomNav />
        </div>
    );
}