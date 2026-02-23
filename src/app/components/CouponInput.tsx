import { Tag } from 'lucide-react';
import { useState } from 'react';

interface CouponInputProps {
  onApply: (code: string) => void;
}

export function CouponInput({ onApply }: CouponInputProps) {
  const [code, setCode] = useState('');

  const handleApply = () => {
    if (code.trim()) {
      onApply(code.trim());
      setCode('');
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <button
        onClick={handleApply}
        className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!code.trim()}
      >
        Apply
      </button>
    </div>
  );
}
