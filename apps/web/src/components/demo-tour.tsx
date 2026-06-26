'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { EventData, STATUS, Step } from 'react-joyride';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';

const Joyride = dynamic(() => import('react-joyride').then((mod) => mod.Joyride), {
    ssr: false,
});

export default function DemoTour() {
    const [isDemo, setIsDemo] = useState(false);
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkDemo = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
            if (profile?.company_id) {
                const { data: company } = await supabase.from('companies').select('is_demo').eq('id', profile.company_id).single();
                if (company?.is_demo) {
                    setIsDemo(true);
                    
                    // Solo iniciamos si no ha completado el tour antes
                    const tourCompleted = localStorage.getItem('masivos_demo_tour_completed');
                    if (!tourCompleted) {
                        setRun(true);
                    }
                }
            }
        };
        checkDemo();
    }, [supabase]);

    const steps: Step[] = [
        {
            target: 'body', // Pop-up central
            content: (
                <div className="text-center p-2">
                    <h2 className="text-xl font-bold mb-2 text-pink-600">¡Bienvenido al Entorno de Prueba!</h2>
                    <p className="text-sm text-slate-600">
                        Prueba cómo funciona nuestro sistema interactuando como si fueras un cliente tuyo. Sigue los pasos para ver la magia.
                    </p>
                </div>
            ),
            placement: 'center',
            skipBeacon: true,
        },
        {
            target: '.nav-atenciones',
            content: 'Primero, entra a la sección de Atenciones (Agenda). Aquí es donde manejarás las citas.',
            placement: 'right',
            skipBeacon: true,
        },
        {
            target: '.btn-nueva-atencion',
            content: 'Haz clic en "Nueva Atención" para registrar una cita. Rellena los datos de prueba y guárdalos; esto activará los mensajes automáticos y lo agregará al CRM.',
            placement: 'bottom',
            skipBeacon: true,
        },
        {
            target: '.nav-mensajeria',
            content: 'Finalmente, entra a Mensajería. ¡Verás que el prospecto ya recibió su mensaje automático de bienvenida por WhatsApp!',
            placement: 'right',
        }
    ];

    const handleJoyrideCallback = (data: EventData) => {
        const { status, type, index, action } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRun(false);
            localStorage.setItem('masivos_demo_tour_completed', 'true');
            return;
        }

        if (type === 'step:after') {
            if (action === 'next') {
                if (index === 0) {
                    if (pathname !== '/dashboard/atenciones') {
                        router.push('/dashboard/atenciones');
                    }
                } else if (index === 2) {
                    router.push('/dashboard/mensajeria');
                }
                setStepIndex(index + 1);
            } else if (action === 'prev') {
                setStepIndex(index - 1);
            }
        }
    };

    if (!mounted || !isDemo) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            continuous={true}
            options={{
                zIndex: 10000,
                primaryColor: '#e11d48', // pink-600
                textColor: '#334155',
                backgroundColor: '#ffffff',
                overlayColor: 'rgba(0, 0, 0, 0.6)',
                showProgress: true,
                buttons: ['back', 'primary', 'skip'],
                overlayClickAction: false,
                blockTargetInteraction: false,
            }}
            styles={{
                buttonPrimary: {
                    backgroundColor: '#e11d48',
                    borderRadius: '8px',
                    padding: '8px 16px',
                },
                buttonBack: {
                    color: '#64748b',
                },
                buttonSkip: {
                    color: '#94a3b8',
                },
                tooltip: {
                    borderRadius: '16px',
                    padding: '16px',
                },
            }}
            locale={{
                back: 'Atrás',
                close: 'Cerrar',
                last: 'Terminar',
                next: 'Siguiente',
                skip: 'Saltar Tour',
            }}
            onEvent={handleJoyrideCallback}
        />
    );
}
