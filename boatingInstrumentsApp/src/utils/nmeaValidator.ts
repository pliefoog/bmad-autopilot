// Simple NMEA validator utilities

export function checksumFromSentence(sentence: string): string | null {
  const m = sentence.match(/\*([0-9A-Fa-f]{2})$/);
  return m ? m[1].toUpperCase() : null;
}

export function computeChecksum(sentence: string): string {
  // Compute XOR of bytes between $ and * (exclusive)
  let start = sentence.indexOf('$');
  if (start === -1) start = 0;
  const star = sentence.indexOf('*');
  const end = star === -1 ? sentence.length : star;
  let cs = 0;
  for (let i = start + 1; i < end; i++) {
    cs ^= sentence.charCodeAt(i);
  }
  const hex = cs.toString(16).toUpperCase();
  return hex.length === 1 ? '0' + hex : hex;
}

export function validateChecksum(sentence: string): {
  ok: boolean;
  expected?: string;
  found?: string;
} {
  const found = checksumFromSentence(sentence);
  const expected = computeChecksum(sentence);
  if (!found) return { ok: false, expected, found: undefined };
  return { ok: found === expected, expected, found };
}

export function validateStructure(sentence: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!sentence || typeof sentence !== 'string') {
    errors.push('empty-or-not-string');
    return { ok: false, errors };
  }
  if (!sentence.startsWith('$')) {
    errors.push('missing-$');
  }
  const starIdx = sentence.indexOf('*');
  if (starIdx === -1) {
    errors.push('missing-*');
  } else {
    const checksumPart = sentence.slice(starIdx + 1).trim();
    if (!/^[0-9A-Fa-f]{2}$/.test(checksumPart)) {
      errors.push('invalid-checksum-format');
    }
  }
  const body = starIdx === -1 ? sentence.slice(1) : sentence.slice(1, starIdx);
  const fields = body.split(',');
  if (fields.length < 1) {
    errors.push('no-fields');
  }
  // Basic length guard
  if (body.length < 3) {
    errors.push('body-too-short');
  }
  return { ok: errors.length === 0, errors };
}

export function parseAndValidate(sentence: string): {
  ok: boolean;
  errors?: string[];
  checksum?: { ok: boolean; expected?: string; found?: string };
} {
  const struct = validateStructure(sentence);
  const cs = validateChecksum(sentence);
  const errors: string[] = [];
  if (!struct.ok) errors.push(...struct.errors);
  if (!cs.ok) errors.push('checksum-mismatch');
  return { ok: errors.length === 0, errors: errors.length ? errors : undefined, checksum: cs };
}
