import React from 'react';
import TrabajadorasView from './TrabajadorasView';

export const metadata = {
  title: 'Trabajadoras | Colquini SAC',
};

export default function TrabajadorasPage() {
  return <div className="animate-in fade-in duration-500"><TrabajadorasView /></div>;
}
