import React from 'react';
import { CheckCircle2, XOctagon, Clock, Play, Pause } from 'lucide-react';

export default function Icon({ icon, className }: { icon: string, className?: string }) {
  switch (icon) {
    case 'heroicons-outline:check-circle': return <CheckCircle2 className={className} size={16} />;
    case 'heroicons-outline:x-circle': return <XOctagon className={className} size={16} />;
    case 'heroicons-outline:clock': return <Clock className={className} size={16} />;
    case 'heroicons-outline:play': return <Play className={className} size={16} />;
    case 'heroicons-outline:pause': return <Pause className={className} size={16} />;
    default: return null;
  }
}
