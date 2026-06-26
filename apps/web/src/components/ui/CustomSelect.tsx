'use client';
import React from 'react';
import Select, { Props as SelectProps, StylesConfig } from 'react-select';

const customStyles: StylesConfig<any, boolean> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bg-select, #fff)',
    borderColor: state.isFocused ? 'var(--primary-color, #E11D48)' : 'var(--border-color, #E4E4E7)',
    borderRadius: '0.5rem', // rounded-lg
    padding: '2px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--primary-color, #E11D48)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '&:hover': {
      borderColor: 'var(--primary-color, #E11D48)'
    }
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bg-select, #fff)',
    borderRadius: '0.5rem', // rounded-lg
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    border: '1px solid var(--border-color, #E4E4E7)',
    zIndex: 10001
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected 
      ? 'var(--primary-color, #E11D48)' 
      : state.isFocused 
        ? 'var(--hover-bg, #FAFAFA)' 
        : 'transparent',
    color: state.isSelected 
      ? '#fff' 
      : 'var(--text-color, #0A0A0A)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--primary-color, #E11D48)',
      color: '#fff'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-color, #0A0A0A)'
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 10001
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--muted-color, #71717A)'
  })
};

export function CustomSelect(props: SelectProps<any, boolean>) {
  return (
    <div className="custom-select-wrapper w-full">
      <style jsx global>{`
        .custom-select-wrapper {
          --bg-select: #ffffff;
          --border-color: #E4E4E7; /* zinc-200 */
          --text-color: #0A0A0A; /* zinc-950 */
          --muted-color: #71717A; /* zinc-500 */
          --hover-bg: #FAFAFA; /* zinc-50 */
          --primary-color: #E11D48; /* rose-600 */
        }
        .dark .custom-select-wrapper {
          --bg-select: #0A0A0A; /* zinc-950 */
          --border-color: #27272A; /* zinc-800 */
          --text-color: #FAFAFA; /* zinc-50 */
          --muted-color: #A1A1AA; /* zinc-400 */
          --hover-bg: #18181B; /* zinc-900 */
          --primary-color: #E11D48; /* rose-600 */
        }
        
        .custom-select-wrapper .css-13cymwt-control {
           border-radius: 0.5rem;
        }
      `}</style>
      <Select 
        styles={customStyles} 
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        menuPosition="fixed"
        {...props} 
      />
    </div>
  );
}
