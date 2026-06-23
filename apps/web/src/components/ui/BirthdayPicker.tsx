import React from 'react';
import { CustomSelect } from './CustomSelect';

interface BirthdayPickerProps {
  value: string; // format "MM-DD"
  onChange: (value: string) => void;
  className?: string;
}

export function BirthdayPicker({ value, onChange, className = '' }: BirthdayPickerProps) {
  const [monthStr, dayStr] = value ? value.split('-') : ['', ''];

  const handleMonthChange = (val: string) => {
    if (!val && !dayStr) onChange('');
    else onChange(`${val || '01'}-${dayStr || '01'}`);
  };

  const handleDayChange = (val: string) => {
    if (!val && !monthStr) onChange('');
    else onChange(`${monthStr || '01'}-${val || '01'}`);
  };

  const months = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const getDaysInMonth = (m: string) => {
    if (['04', '06', '09', '11'].includes(m)) return 30;
    if (m === '02') return 29; // allow leap day
    return 31;
  };

  const maxDays = monthStr ? getDaysInMonth(monthStr) : 31;
  const days = Array.from({ length: maxDays }, (_, i) => {
    const d = (i + 1).toString().padStart(2, '0');
    return { value: d, label: d };
  });

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="flex-1">
        <CustomSelect
          options={months}
          value={months.find(m => m.value === monthStr) || null}
          onChange={(opt) => handleMonthChange(opt?.value || '')}
          placeholder="Mes"
          isSearchable={false}
        />
      </div>
      <div className="w-24">
        <CustomSelect
          options={days}
          value={days.find(d => d.value === dayStr) || null}
          onChange={(opt) => handleDayChange(opt?.value || '')}
          placeholder="Día"
          isSearchable={false}
        />
      </div>
    </div>
  );
}
