import React from 'react';
import { BrandMark } from '@/components/brand/BrandMark';

const Loading = () => {
    return (
        <div className="screen_loader fixed inset-0 z-[60] grid place-content-center bg-bg dark:bg-dark" role="status" aria-label="Cargando Renova CRM">
            <BrandMark
                size={76}
                priority
                imageClassName="animate-[spin_1.2s_linear_infinite] motion-reduce:animate-none"
            />
            <span className="sr-only">Cargando Renova CRM</span>
        </div>
    );
};

export default Loading;
