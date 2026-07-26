'use client';
import { IRootState } from '@/store';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useSelector } from 'react-redux';

const ContentAnimation = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    return (
        <main
            id="main-content"
            key={pathname}
            tabIndex={-1}
            className={`${themeConfig.animation} animate__animated p-4 outline-none sm:p-6`}
        >
            {children}
        </main>
    );
};

export default ContentAnimation;
