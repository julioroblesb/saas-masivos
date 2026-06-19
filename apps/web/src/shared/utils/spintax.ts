/**
 * Resuelve sintaxis Spintax básica: {Hola|Buenos días|Saludos}
 * Reemplaza cada bloque con una opción aleatoria.
 */
export function resolveSpintax(text: string, contactName?: string): string {
  if (!text) return text;
  
  let resolvedText = text;

  // Reemplazar variables
  if (contactName) {
    resolvedText = resolvedText.replace(/\[Nombre\]/gi, contactName);
  } else {
    // Si no hay nombre pero se usa la variable, podríamos dejarla o poner algo genérico.
    // Vamos a reemplazar por una cadena vacía o "Amigo"
    resolvedText = resolvedText.replace(/\[Nombre\]/gi, '');
  }

  // Expresión regular para encontrar bloques {opcion1|opcion2}
  const spintaxRegex = /{([^{}]+)}/g;
  
  let match;
  
  // Mientras sigan existiendo bloques spintax, los resolvemos (permite anidación simple si se hace iterativo, aunque aquí es lineal)
  while ((match = spintaxRegex.exec(resolvedText)) !== null) {
    const fullMatch = match[0];
    const options = match[1].split('|');
    const randomChoice = options[Math.floor(Math.random() * options.length)];
    
    resolvedText = resolvedText.replace(fullMatch, randomChoice);
    // Reiniciar el regex state porque el string cambió de longitud
    spintaxRegex.lastIndex = 0;
  }
  
  return resolvedText;
}
