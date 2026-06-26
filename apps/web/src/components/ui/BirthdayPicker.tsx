import React from 'react';
import { CustomSelect } from './CustomSelect';

interface BirthdayPickerProps {
  value: string; // format "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
}

export function BirthdayPicker({ value, onChange, className = '' }: BirthdayPickerProps) {
  const [yearStr, monthStr, dayStr] = value ? value.split('-') : ['', '', ''];

  const handleYearChange = (val: string) => {
    if (!val && !monthStr && !dayStr) onChange('');
    else onChange(`${val || '1990'}-${monthStr || '01'}-${dayStr || '01'}`);
  };

  const handleMonthChange = (val: string) => {
    if (!val && !dayStr && !yearStr) onChange('');
    else onChange(`${yearStr || '1990'}-${val || '01'}-${dayStr || '01'}`);
  };

  const handleDayChange = (val: string) => {
    if (!val && !monthStr && !yearStr) onChange('');
    else onChange(`${yearStr || '1990'}-${monthStr || '01'}-${val || '01'}`);
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => {
    const y = (currentYear - i).toString();
    return { value: y, label: y };
  });

  const getDaysInMonth = (m: string, y: string) => {
    if (['04', '06', '09', '11'].includes(m)) return 30;
    if (m === '02') {
      const yearNum = y ? parseInt(y) : 1990;
      const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
      return isLeap ? 29 : 28;
    }
    return 31;
  };

  const maxDays = monthStr ? getDaysInMonth(monthStr, yearStr) : 31;
  const days = Array.from({ length: maxDays }, (_, i) => {
    const d = (i + 1).toString().padStart(2, '0');
    return { value: d, label: d };
  });

  return (
    <div className={`grid grid-cols-[1fr,1.5fr,1fr] gap-2 ${className}`}>
      <div>
        <CustomSelect
          options={days}
          value={days.find(d => d.value === dayStr) || null}
          onChange={(opt) => handleDayChange(opt?.value || '')}
          placeholder="Día"
          isSearchable={false}
        />
      </div>
      <div>
        <CustomSelect
          options={months}
          value={months.find(m => m.value === monthStr) || null}
          onChange={(opt) => handleMonthChange(opt?.value || '')}
          placeholder="Mes"
          isSearchable={false}
        />
      </div>
      <div>
        <CustomSelect
          options={years}
          value={years.find(y => y.value === yearStr) || null}
          onChange={(opt) => handleYearChange(opt?.value || '')}
          placeholder="Año"
          isSearchable={true}
        />
      </div>
    </div>
  );
}
