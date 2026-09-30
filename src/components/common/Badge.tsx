import React from 'react';

interface BadgeProps {
  status: string;
  category?: string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const s = (status || '').toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (s.includes('untouched')) {
    colorClasses = 'bg-slate-100 text-slate-700 border-slate-300 font-medium';
  } else if (s.includes('hot')) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
  } else if (s.includes('order placed') || s.includes('converted') || s.includes('completed')) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';
  } else if (s.includes('interested')) {
    colorClasses = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (s.includes('follow-up') || s.includes('followup')) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (s.includes('call back') || s.includes('callback')) {
    colorClasses = 'bg-yellow-50 text-yellow-800 border-yellow-300';
  } else if (s.includes('contacted')) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (s.includes('money problem')) {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (s.includes('payment pending') || s.includes('thinking')) {
    colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (s.includes('not interested') || s.includes('wrong') || s.includes('lost') || s.includes('do not call')) {
    colorClasses = 'bg-red-50 text-red-700 border-red-200';
  } else if (s.includes('busy') || s.includes('unreachable') || s.includes('no answer')) {
    colorClasses = 'bg-stone-100 text-stone-700 border-stone-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status}
    </span>
  );
};
