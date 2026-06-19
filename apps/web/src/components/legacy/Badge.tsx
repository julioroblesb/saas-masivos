import React from 'react';
import { Badge as ShadcnBadge } from '../ui/badge';
import Icon from './Icon';

export default function Badge({ label, className, icon }: { label: string, className?: string, icon?: string }) {
  return (
    <ShadcnBadge variant="secondary" className={`flex items-center w-fit gap-1 font-medium px-2.5 py-0.5 rounded-full ${className || ''}`}>
      {icon && <Icon icon={icon} />}
      {label}
    </ShadcnBadge>
  );
}
