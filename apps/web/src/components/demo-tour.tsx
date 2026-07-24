'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { STATUS, Step } from 'react-joyride';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '@/store/themeConfigSlice';
import { IRootState } from '@/store';

const Joyride = dynamic(() => import('react-joyride'), {
    ssr: false,
});

export default function DemoTour() {
    const [isDemo, setIsDemo] = useState(false);
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const dispatch = useDispatch();
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

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
                        // Cerrar sidebar en móvil si está abierto para no tapar el tour
                        if (window.innerWidth < 1024 && themeConfig.sidebar) {
                            dispatch(toggleSidebar());
                        }
                    }
                }
            }
        };
        checkDemo();
    }, [supabase]);

    const steps: any[] = [
        {
            target: 'body',
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
            target: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'body' : '.nav-atenciones',
            content: 'Estás en la sección de Atenciones (Agenda). Aquí manejarás todas las citas.',
            placement: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'center' : 'right',
            skipBeacon: true,
        },
        {
            target: '.btn-nueva-atencion',
            content: 'Presiona en "Nueva Atención" para abrir el registro de citas.',
            placement: 'bottom',
            spotlightClicks: true,
            disableBeacon: true,
            hideFooter: true,
        },
        {
            target: '.btn-nuevo-cliente',
            content: 'Presiona aquí ("+ Nuevo cliente") para que pruebes el sistema ingresando tus datos.',
            placement: 'bottom',
            spotlightClicks: true,
            disableBeacon: true,
            hideFooter: true,
        },
        {
            target: '.inputs-nuevo-cliente',
            content: (
                <div className="text-left">
                    <p className="mb-2"><strong>1.</strong> Ingresa tu nombre (o un nombre de prueba).</p>
                    <p><strong>2.</strong> Ingresa tu número de WhatsApp real con tu código de país (Ej: <strong>51</strong>999888777). <br/><br/><em>No uses símbolos ni espacios. Si usas tu número real, el bot de prueba te enviará un mensaje.</em></p>
                </div>
            ),
            placement: 'bottom',
            spotlightClicks: true,
            disableBeacon: true,
            hideBackButton: true,
        },
        {
            target: '.select-servicio',
            content: 'Ahora selecciona un servicio cualquiera de la lista y presiona el botón "Registrar Atención" al final.',
            placement: 'right',
            spotlightClicks: true,
            hideFooter: true,
            styles: { buttonNext: { display: 'none' }, buttonSkip: { display: 'none' }, buttonBack: { display: 'none' } }
        },
        {
            target: '.btn-actions-atencion',
            content: '¡Cita registrada! Presiona sobre los tres puntitos para ver las opciones de esta atención.',
            placement: 'left',
            spotlightClicks: true,
            hideBackButton: true,
            styles: { buttonNext: { display: 'none' }, buttonSkip: { display: 'none' } }
        },
        {
            target: '.btn-completar-atencion',
            content: 'Ahora marca esta cita como "Completar Servicio".',
            placement: 'left',
            spotlightClicks: true,
            hideBackButton: true,
            styles: { buttonNext: { display: 'none' }, buttonSkip: { display: 'none' } }
        },
        {
            target: '.btn-completar-submit',
            content: 'Confirma el detalle presionando en "Completar Atención".',
            placement: 'bottom',
            spotlightClicks: true,
            hideBackButton: true,
            styles: { buttonNext: { display: 'none' }, buttonSkip: { display: 'none' } }
        },
        {
            target: 'body',
            content: (
                <div className="text-left space-y-2">
                    <p className="font-bold text-lg mb-2">¡Cita Completada! 🎉</p>
                    <p>Al completar el servicio, ocurren 3 cosas automáticamente:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Se registra al cliente y su fecha de última atención.</li>
                        <li>Recibe un <strong>WhatsApp de agradecimiento</strong> en minutos.</li>
                        <li>Se programa un <strong>recordatorio automático</strong> para su próxima sesión de mantenimiento, fidelizándolo para que regrese.</li>
                    </ul>
                </div>
            ),
            placement: 'center',
        },
        {
            target: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'body' : '.nav-mensajeria',
            content: 'Finalmente, entra a Mensajería para que puedas revisar el resto del sistema.',
            placement: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'center' : 'right',
        }
    ];

    // Escuchar clics para avanzar pasos cuando hideNext es true
    useEffect(() => {
        if (!run || !isDemo) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (stepIndex === 2 && target.closest('.btn-nueva-atencion')) {
                setTimeout(() => {
                    setStepIndex(3);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 400); // After animation finishes
                }, 400);
            }
            else if (stepIndex === 3 && target.closest('.btn-nuevo-cliente')) {
                setTimeout(() => {
                    setStepIndex(4);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
                }, 300);
            }
            else if (stepIndex === 5 && target.closest('.btn-registrar-atencion')) {
                setTimeout(() => {
                    setStepIndex(6);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 400); // After modal closes and table updates
                }, 1500); // Esperar que guarde y cierre el modal
            }
            else if (stepIndex === 6 && target.closest('.btn-actions-atencion')) {
                setTimeout(() => {
                    setStepIndex(7);
                    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
                }, 300);
            }
            else if (stepIndex === 7 && target.closest('.btn-completar-atencion')) {
                setTimeout(() => {
                    setStepIndex(8);
                }, 800);
            }
            else if (stepIndex === 8 && target.closest('.btn-completar-submit')) {
                setTimeout(() => {
                    setStepIndex(9);
                }, 1200); // Wait for modal to close
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [run, isDemo, stepIndex]);

    const handleJoyrideCallback = (data: any) => {
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
                    setStepIndex(1);
                } else if (index === 1) { // .nav-atenciones
                    setStepIndex(2);
                } else if (index === 2) { // .btn-nueva-atencion
                    (document.querySelector('.btn-nueva-atencion') as HTMLElement)?.click();
                    setTimeout(() => setStepIndex(3), 400);
                } else if (index === 3) { // .btn-nuevo-cliente
                    (document.querySelector('.btn-nuevo-cliente') as HTMLElement)?.click();
                    setTimeout(() => setStepIndex(4), 400);
                } else if (index === 4) { // .inputs-nuevo-cliente
                    const nameInput = document.querySelector('input[placeholder="Nombre completo"]') as HTMLInputElement;
                    const phoneInput = document.querySelector('input[placeholder="Teléfono (ej: 51987654321)"]') as HTMLInputElement;
                    if (!nameInput?.value?.trim() || !phoneInput?.value?.trim()) {
                        toast.error("Por favor completa tu nombre y teléfono antes de continuar", { duration: 4000 });
                        return; // Prevent advancing
                    }
                    setStepIndex(5);
                } else if (index === 5) { // .select-servicio
                    (document.querySelector('.btn-registrar-atencion') as HTMLElement)?.click();
                    setTimeout(() => {
                        setStepIndex(6);
                        setTimeout(() => window.dispatchEvent(new Event('resize')), 400);
                    }, 1500);
                } else if (index === 6) { // .btn-actions-atencion
                    // The menu opens on hover, but we can't simulate hover easily. 
                    // However, we can just advance to step 7 and tell them to click "Completar".
                    setStepIndex(7);
                } else if (index === 7) { // .btn-completar-atencion
                    (document.querySelector('.btn-completar-atencion') as HTMLElement)?.click();
                    setTimeout(() => setStepIndex(8), 800);
                } else if (index === 8) { // .btn-completar-submit
                    (document.querySelector('.btn-completar-submit') as HTMLElement)?.click();
                    setTimeout(() => setStepIndex(9), 1200);
                } else if (index === 9) { // informative body step
                    router.push('/dashboard/mensajeria');
                    setStepIndex(10);
                } else if (index === 10) { // .nav-mensajeria
                    // Reached the end manually, we can just finish
                    setStepIndex(11);
                }
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
            {...({
                options: {
                    zIndex: 10000,
                    primaryColor: '#e11d48',
                    textColor: '#334155',
                    backgroundColor: '#ffffff',
                    overlayColor: 'rgba(0, 0, 0, 0.6)',
                    showProgress: false,
                    buttons: ['back', 'primary', 'skip'],
                    overlayClickAction: false,
                    blockTargetInteraction: false,
                }
            } as any)}
            styles={{
                buttonNext: {
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
