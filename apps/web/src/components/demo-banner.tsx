'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import IconMessage from '@/components/icon/icon-message';

export default function DemoBanner() {
    const [isDemo, setIsDemo] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkDemo = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch company ID from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (profile?.company_id) {
                // Fetch is_demo from company
                const { data: company } = await supabase
                    .from('companies')
                    .select('is_demo')
                    .eq('id', profile.company_id)
                    .single();

                if (company?.is_demo) {
                    setIsDemo(true);
                }
            }
        };

        checkDemo();
    }, [supabase]);

    if (!isDemo) return null;

    return (
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white w-full py-2.5 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 shadow-md z-[60] relative">
            <span className="font-medium text-xs sm:text-sm text-center">
                Estás en un entorno de demostración. Los datos se borrarán en 24 horas.
            </span>
            <a 
                href="https://wa.me/51936755465?text=Hola%20Julio,%20estoy%20probando%20el%20demo%20y%20deseo%20contratar%20el%20sistema." 
                target="_blank" 
                rel="noreferrer"
                className="bg-white text-pink-600 font-bold px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-sm hover:bg-pink-50 transition-colors flex items-center text-xs sm:text-sm whitespace-nowrap"
            >
                <IconMessage className="w-4 h-4 mr-1.5" />
                ¿Te gusta el sistema? Contáctanos
            </a>
        </div>
    );
}
