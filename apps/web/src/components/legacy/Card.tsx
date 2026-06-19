import React from 'react';
import { Card as ShadcnCard } from '../ui/card';

export default function Card({ children, className, style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return <ShadcnCard className={`p-6 ${className || ''}`} style={style}>{children}</ShadcnCard>;
}
