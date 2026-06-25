'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import IconMessage from '@/components/icon/icon-message';

export default function DemoBanner() {
    const [isDemo, setIsDemo] = useState(false);
    const supabase = createClientComponentClient();

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
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white w-full py-3 px-4 flex items-center justify-center shadow-md z-50 sticky top-0">
            <span className="font-medium mr-4 text-sm sm:text-base">
                Estás en un entorno de demostración. Los datos se borrarán en 24 horas.
            </span>
            <a 
                href="https://wa.me/51936755465?text=Hola%20Julio,%20estoy%20probando%20el%20demo%20y%20deseo%20contratar%20el%20sistema." 
                target="_blank" 
                rel="noreferrer"
                className="bg-white text-pink-600 font-bold px-4 py-1.5 rounded-full shadow hover:bg-pink-50 transition-colors flex items-center text-sm"
            >
                <IconMessage className="w-4 h-4 mr-2" />
                Si deseas contratar esto, contáctanos aquí
            </a>
        </div>
    );
}
