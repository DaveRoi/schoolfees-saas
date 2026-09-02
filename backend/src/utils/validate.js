/** Petit helper de validation manuelle (alternative légère à zod pour rester lisible). */
export function validate(schema, data) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Champ requis manquant : ${field}`);
      continue;
    }
    if (value === undefined || value === null || value === '') continue;
    if (rules.type === 'number' && (isNaN(Number(value)))) errors.push(`${field} doit être un nombre.`);
    if (rules.type === 'string' && typeof value !== 'string') errors.push(`${field} doit être une chaîne.`);
    if (rules.min && String(value).length < rules.min) errors.push(`${field} : ${rules.min} caractères minimum.`);
    if (rules.enum && !rules.enum.includes(value)) errors.push(`${field} : valeur non autorisée.`);
    if (rules.pattern && !rules.pattern.test(String(value))) errors.push(`${field} : format invalide.`);
  }
  return errors;
}
