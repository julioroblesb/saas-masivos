'use client';
import React from 'react';
import Select, { Props as SelectProps, StylesConfig } from 'react-select';

const customStyles: StylesConfig<any, boolean> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bg-select, #fff)',
    borderColor: state.isFocused ? '#4361ee' : 'var(--border-color, #e0e6ed)',
    borderRadius: '0.75rem', // rounded-xl
    padding: '2px',
    boxShadow: state.isFocused ? '0 0 0 1px #4361ee' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '&:hover': {
      borderColor: '#4361ee'
    }
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-select, #fff)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid var(--border-color, #e0e6ed)',
    zIndex: 9999
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? '#4361ee' 
      : state.isFocused 
        ? 'var(--hover-bg, #f8fafc)' 
        : 'transparent',
    color: state.isSelected 
      ? '#fff' 
      : 'var(--text-color, #0e1726)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#4361ee',
      color: '#fff'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-color, #0e1726)'
  })
};

export function CustomSelect(props: SelectProps<any, boolean>) {
  return (
    <div className="custom-select-wrapper">
      <style jsx global>{`
        .custom-select-wrapper {
          --bg-select: #fff;
          --border-color: #e0e6ed;
          --text-color: #0e1726;
          --hover-bg: #f8fafc;
        }
        .dark .custom-select-wrapper {
          --bg-select: #191e3a;
          --border-color: #1b2e4b;
          --text-color: #888ea8;
          --hover-bg: #0e1726;
        }
      `}</style>
      <Select styles={customStyles} {...props} />
    </div>
  );
}
