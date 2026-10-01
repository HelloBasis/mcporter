const MAX_DEPTH = 8;

// Builds a plausible example value for a JSON Schema node so generated help can show a
// runnable invocation even when a flag wraps a nested object (e.g. `--params '{"id":"1"}'`).
export function sampleFromSchema(schema: unknown, propertyName = '', depth = 0): unknown {
  if (!schema || typeof schema !== 'object' || depth > MAX_DEPTH) {
    return 'value';
  }
  const record = schema as Record<string, unknown>;
  if (record.const !== undefined) {
    return record.const;
  }
  if (Array.isArray(record.enum) && record.enum.length > 0) {
    return record.enum[0];
  }
  if (record.default !== undefined) {
    return record.default;
  }
  const variants = (record.anyOf ?? record.oneOf) as unknown[] | undefined;
  if (Array.isArray(variants) && variants.length > 0) {
    return sampleFromSchema(variants[0], propertyName, depth);
  }
  const type = resolvePrimaryType(record.type);
  switch (type) {
    case 'object':
      return sampleObject(record, depth);
    case 'array':
      return [sampleFromSchema(record.items, propertyName, depth + 1)];
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return true;
    case 'null':
      return null;
    case 'string':
      return sampleString(record, propertyName);
    default:
      if (record.properties && typeof record.properties === 'object') {
        return sampleObject(record, depth);
      }
      return 'value';
  }
}

function sampleObject(record: Record<string, unknown>, depth: number): Record<string, unknown> {
  const properties =
    record.properties && typeof record.properties === 'object' ? (record.properties as Record<string, unknown>) : {};
  const required = Array.isArray(record.required) ? (record.required as string[]) : [];
  const names = Object.keys(properties);
  const chosen = required.length > 0 ? names.filter((name) => required.includes(name)) : names.slice(0, 2);
  return Object.fromEntries(chosen.map((name) => [name, sampleFromSchema(properties[name], name, depth + 1)]));
}

function sampleString(record: Record<string, unknown>, propertyName: string): string {
  const format = typeof record.format === 'string' ? record.format : undefined;
  const description = typeof record.description === 'string' ? record.description : '';
  if (format === 'date' || /\bYYYY-MM-DD\b/i.test(description)) {
    return '2024-01-31';
  }
  if (format === 'date-time') {
    return '2024-01-31T00:00:00Z';
  }
  if (format === 'uuid') {
    return '00000000-0000-0000-0000-000000000000';
  }
  if (format === 'uri' || /url/i.test(propertyName)) {
    return 'https://example.com';
  }
  if (/(^|_|-)id$|Id$/.test(propertyName)) {
    return 'example-id';
  }
  return 'value';
}

function resolvePrimaryType(type: unknown): string | undefined {
  if (typeof type === 'string') {
    return type;
  }
  if (Array.isArray(type)) {
    return type.find((entry): entry is string => typeof entry === 'string' && entry !== 'null');
  }
  return undefined;
}
