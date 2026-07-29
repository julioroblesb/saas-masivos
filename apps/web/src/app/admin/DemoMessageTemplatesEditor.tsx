'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, MessageCircle, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateDemoMessageTemplate } from './actions';

export interface DemoMessageTemplate {
  template_key: 'immediate_info' | 'day_five_follow_up';
  message_template: string;
  delay_seconds: number;
  enabled: boolean;
  updated_at: string;
}

interface Props {
  templates: DemoMessageTemplate[];
}

const TEMPLATE_DETAILS = {
  immediate_info: {
    title: 'Explicación inmediata',
    timing: '8 segundos después del saludo',
    description: 'Aclara que el primer mensaje fue automático y explica el seguimiento.',
  },
  day_five_follow_up: {
    title: 'Oferta del quinto día',
    timing: '5 días después de solicitar la demo',
    description: 'Solo se envía si el lead todavía no fue marcado como cliente o descartado.',
  },
} as const;

export function DemoMessageTemplatesEditor({ templates }: Props) {
  const router = useRouter();
  const sortedTemplates = useMemo(
    () =>
      [...templates].sort((a, b) =>
        a.template_key === 'immediate_info' || b.template_key === 'day_five_follow_up' ? -1 : 1,
      ),
    [templates],
  );
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      templates.map((template) => [
        template.template_key,
        {
          messageTemplate: template.message_template,
          enabled: template.enabled,
        },
      ]),
    ) as Record<
      DemoMessageTemplate['template_key'],
      { messageTemplate: string; enabled: boolean }
    >,
  );
  const [savingKey, setSavingKey] = useState<DemoMessageTemplate['template_key'] | null>(null);

  const saveTemplate = async (templateKey: DemoMessageTemplate['template_key']) => {
    const draft = drafts[templateKey];
    if (!draft) return;

    setSavingKey(templateKey);
    try {
      const result = await updateDemoMessageTemplate({
        templateKey,
        messageTemplate: draft.messageTemplate,
        enabled: draft.enabled,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Mensaje automático actualizado');
      router.refresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el mensaje');
    } finally {
      setSavingKey(null);
    }
  };

  if (sortedTemplates.length === 0) return null;

  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:hidden sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <strong className="block text-sm text-zinc-900 dark:text-zinc-100">
              Mensajes automáticos de la demo
            </strong>
            <span className="block text-xs text-zinc-500">
              Revisa, edita o pausa los mensajes que reciben tus leads.
            </span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">
          Configurar
        </span>
        <span className="hidden shrink-0 text-xs font-semibold text-zinc-500 group-open:inline">
          Cerrar
        </span>
      </summary>

      <div className="border-t border-zinc-200 px-4 py-5 dark:border-zinc-800 sm:px-5">
        <p className="mb-5 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Variables disponibles: <code>{'{{nombre}}'}</code>, <code>{'{{negocio}}'}</code>,{' '}
          <code>{'{{precio_oferta}}'}</code> y <code>{'{{precio_regular}}'}</code>.
        </p>

        <div className="space-y-6">
          {sortedTemplates.map((template) => {
            const details = TEMPLATE_DETAILS[template.template_key];
            const draft = drafts[template.template_key];
            if (!draft) return null;

            return (
              <section
                key={template.template_key}
                aria-labelledby={`demo-template-${template.template_key}`}
                className="grid gap-3 border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0 dark:border-zinc-800"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h3
                      id={`demo-template-${template.template_key}`}
                      className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      {details.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{details.description}</p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {details.timing}
                    </span>
                  </div>

                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [template.template_key]: {
                            ...current[template.template_key],
                            enabled: event.target.checked,
                          },
                        }))
                      }
                      className="size-4 rounded border-zinc-300 text-primary focus:ring-primary/30"
                    />
                    Envío activo
                  </label>
                </div>

                <textarea
                  value={draft.messageTemplate}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [template.template_key]: {
                        ...current[template.template_key],
                        messageTemplate: event.target.value,
                      },
                    }))
                  }
                  rows={5}
                  maxLength={1200}
                  aria-label={`Contenido de ${details.title}`}
                  className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm leading-6 text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />

                <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <span className="text-xs tabular-nums text-zinc-500">
                    {draft.messageTemplate.length}/1200 caracteres
                  </span>
                  <button
                    type="button"
                    disabled={savingKey === template.template_key}
                    onClick={() => saveTemplate(template.template_key)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 sm:w-auto"
                  >
                    <Save className="size-4" aria-hidden="true" />
                    {savingKey === template.template_key ? 'Guardando...' : 'Guardar mensaje'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </details>
  );
}
