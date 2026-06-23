'use client';
import React from 'react';
import { Bot, MessageSquare, FileText, Image as ImageIcon, Mic, ArrowRight } from 'lucide-react';

export function BotConfig() {
  return (
    <div className="panel animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto border-0 shadow-lg bg-gradient-to-br from-[#1A1A1A] to-dark dark:from-[#1A1A1A] dark:to-dark">
      <div className="text-center p-8 pb-4">
        <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Bot className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white-light mb-4">
          Potencia tu WhatsApp con Inteligencia Artificial
        </h1>
        <p className="text-slate-500 dark:text-white-dark text-lg max-w-2xl mx-auto">
          Descubre todas las capacidades que puedes integrar en tu línea gracias a nuestra infraestructura soportada por BuilderBot. Atiende a tus clientes 24/7 como un humano real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
        
        <div className="bg-white dark:bg-[#1b2e4b] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#191e3a] hover:-translate-y-1 transition-transform">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white-light mb-2">Conversa como un Humano</h3>
              <p className="text-slate-500 dark:text-white-dark text-sm leading-relaxed">
                El bot analiza el contexto y responde de manera natural, persuasiva y empática. Olvídate de los menús rígidos; tus clientes sentirán que hablan con un asesor real.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b2e4b] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#191e3a] hover:-translate-y-1 transition-transform">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white-light mb-2">Envío de Archivos y Multimedia</h3>
              <p className="text-slate-500 dark:text-white-dark text-sm leading-relaxed">
                Capacidad nativa para enviar catálogos en PDF, videos demostrativos, cotizaciones y fotografías de tus productos directamente en la conversación de WhatsApp.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b2e4b] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#191e3a] hover:-translate-y-1 transition-transform">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white-light mb-2">Entiende Audios (Voice-to-Text)</h3>
              <p className="text-slate-500 dark:text-white-dark text-sm leading-relaxed">
                ¿Tus clientes envían notas de voz? El bot transcribe y comprende automáticamente el audio para darles una respuesta precisa sin intervención humana.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1b2e4b] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-[#191e3a] hover:-translate-y-1 transition-transform">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white-light mb-2">Análisis de Imágenes</h3>
              <p className="text-slate-500 dark:text-white-dark text-sm leading-relaxed">
                Los clientes pueden enviar fotos (ej. un recibo de pago o un producto dañado) y la Inteligencia Artificial interpretará el contenido visual al instante.
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className="p-8 pt-0">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-center text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-black opacity-10 blur-2xl"></div>
          
          <h2 className="text-2xl font-bold mb-4 relative z-10">¿Listo para construir el bot de tus sueños?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto relative z-10">
            Nuestros ingenieros expertos pueden desarrollar un flujo conversacional hecho a medida para tu modelo de negocio, integrando tu CRM, base de datos e inteligencia artificial.
          </p>
          
          <a 
            href="https://wa.me/tunumerodeasesoria" 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center space-x-2 bg-white text-primary hover:bg-slate-50 px-8 py-3 rounded-full font-bold transition-colors relative z-10 shadow-sm"
          >
            <span>Solicitar Asesoría Personalizada</span>
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>

    </div>
  );
}
