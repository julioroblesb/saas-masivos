export interface SpintaxSettings {
  greetings?: string[];
  farewells?: string[];
}

/**
 * Resuelve sintaxis Spintax básica: {Hola|Buenos días|Saludos}
 * Reemplaza cada bloque con una opción aleatoria.
 * También resuelve {{saludo}} y {{despedida}} con opciones provistas.
 */
export function resolveSpintax(text: string, settings?: SpintaxSettings): string {
  if (!text) return text;
  
  let resolvedText = text;

  // Reemplazar {{saludo}} y {{despedida}} con opciones de settings si existen
  if (settings?.greetings && settings.greetings.length > 0) {
    resolvedText = resolvedText.replace(/\{\{saludo\}\}/gi, () => {
      return settings.greetings![Math.floor(Math.random() * settings.greetings!.length)];
    });
  }

  if (settings?.farewells && settings.farewells.length > 0) {
    resolvedText = resolvedText.replace(/\{\{despedida\}\}/gi, () => {
      return settings.farewells![Math.floor(Math.random() * settings.farewells!.length)];
    });
  }

  // Expresión regular para encontrar bloques {opcion1|opcion2} nativo
  const spintaxRegex = /{([^{}]+)}/g;
  
  let match;
  
  while ((match = spintaxRegex.exec(resolvedText)) !== null) {
    // Si contiene "name" es probable que sea el tag nativo de Builderbot "{name}", ignorar.
    if (match[1] === 'name') {
      continue;
    }
    
    const fullMatch = match[0];
    const options = match[1].split('|');
    const randomChoice = options[Math.floor(Math.random() * options.length)];
    
    resolvedText = resolvedText.replace(fullMatch, randomChoice);
    // Reiniciar el regex state porque el string cambió de longitud
    spintaxRegex.lastIndex = 0;
  }
  
  return resolvedText;
}
