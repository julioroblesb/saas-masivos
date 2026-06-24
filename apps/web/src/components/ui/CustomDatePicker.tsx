'use client';
import React, { forwardRef } from 'react';
import Flatpickr from 'react-flatpickr';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import 'flatpickr/dist/themes/dark.css';

interface CustomDatePickerProps extends Omit<React.ComponentProps<typeof Flatpickr>, 'value'> {
  value: string | Date | Date[];
  onChangeDate: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  enableTime?: boolean;
}

export const CustomDatePicker = forwardRef<any, CustomDatePickerProps>(({ value, onChangeDate, placeholder, className, enableTime = false, ...props }, ref) => {
  return (
    <div className="custom-datepicker-wrapper w-full relative">
      <style jsx global>{`
        .custom-datepicker-wrapper .flatpickr-calendar {
          background: #ffffff;
          border: 1px solid #E4E4E7;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          padding: 0.5rem;
        }
        
        .dark .custom-datepicker-wrapper .flatpickr-calendar {
          background: #0A0A0A;
          border: 1px solid #27272A;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }

        .custom-datepicker-wrapper .flatpickr-months .flatpickr-month {
          background: transparent;
          color: #0A0A0A;
          fill: #0A0A0A;
        }
        .dark .custom-datepicker-wrapper .flatpickr-months .flatpickr-month {
          color: #FAFAFA;
          fill: #FAFAFA;
        }

        .custom-datepicker-wrapper .flatpickr-current-month .flatpickr-monthDropdown-months {
          background: transparent;
        }
        .custom-datepicker-wrapper .flatpickr-current-month .flatpickr-monthDropdown-months:hover {
          background: transparent;
        }

        .custom-datepicker-wrapper .flatpickr-current-month input.cur-year {
          color: inherit;
        }

        .custom-datepicker-wrapper span.flatpickr-weekday {
          background: transparent;
          color: #71717A;
          font-weight: 600;
        }
        .dark .custom-datepicker-wrapper span.flatpickr-weekday {
          color: #A1A1AA;
        }

        .custom-datepicker-wrapper .flatpickr-day {
          border-radius: 0.375rem;
          color: #0A0A0A;
          border: 1px solid transparent;
        }
        .dark .custom-datepicker-wrapper .flatpickr-day {
          color: #FAFAFA;
        }

        .custom-datepicker-wrapper .flatpickr-day:hover,
        .custom-datepicker-wrapper .flatpickr-day.prevMonthDay:hover,
        .custom-datepicker-wrapper .flatpickr-day.nextMonthDay:hover {
          background: #FAFAFA;
          border-color: #E4E4E7;
        }
        .dark .custom-datepicker-wrapper .flatpickr-day:hover,
        .dark .custom-datepicker-wrapper .flatpickr-day.prevMonthDay:hover,
        .dark .custom-datepicker-wrapper .flatpickr-day.nextMonthDay:hover {
          background: #18181B;
          border-color: #27272A;
        }

        .custom-datepicker-wrapper .flatpickr-day.selected,
        .custom-datepicker-wrapper .flatpickr-day.selected:hover {
          background: #E11D48 !important;
          border-color: #E11D48 !important;
          color: #ffffff !important;
          font-weight: 600;
        }
        
        .custom-datepicker-wrapper .flatpickr-day.flatpickr-disabled {
          color: #A1A1AA;
        }
        .dark .custom-datepicker-wrapper .flatpickr-day.flatpickr-disabled {
          color: #52525B;
        }
        
        .custom-datepicker-wrapper .flatpickr-time {
          border-top: 1px solid #E4E4E7;
          margin-top: 0.5rem;
        }
        .dark .custom-datepicker-wrapper .flatpickr-time {
          border-top: 1px solid #27272A;
        }
      `}</style>
      <Flatpickr
        ref={ref}
        value={value}
        onChange={([date], dateStr) => {
          if (date) {
            onChangeDate(date.toISOString());
          } else {
            onChangeDate('');
          }
        }}
        options={{
          locale: Spanish,
          dateFormat: enableTime ? "Z" : "Y-m-d", // Use ISO format for value
          altInput: true,
          altFormat: enableTime ? "d M Y, h:i K" : "d M Y",
          enableTime: enableTime,
          time_24hr: false
        }}
        placeholder={placeholder}
        className={className || "form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"}
        {...props}
      />
    </div>
  );
});

CustomDatePicker.displayName = 'CustomDatePicker';
