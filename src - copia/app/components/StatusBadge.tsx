import { Clock, Percent, AlertTriangle } from 'lucide-react';

type BadgeType = 'offer' | 'fast' | 'saturated';

interface StatusBadgeProps {
  type: BadgeType;
}

export function StatusBadge({ type }: StatusBadgeProps) {
  const config = {
    offer: {
      text: 'OFFER',
      icon: Percent,
      className: 'bg-green-500 text-white'
    },
    fast: {
      text: 'FAST QUEUE',
      icon: Clock,
      className: 'bg-blue-500 text-white'
    },
    saturated: {
      text: 'QUEUE SATURATED',
      icon: AlertTriangle,
      className: 'bg-red-500 text-white'
    }
  };

  const { text, icon: Icon, className } = config[type];

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      <span>{text}</span>
    </div>
  );
}
