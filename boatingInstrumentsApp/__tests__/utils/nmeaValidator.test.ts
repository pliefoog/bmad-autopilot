import { validateChecksum, computeChecksum, checksumFromSentence, validateStructure, parseAndValidate } from '@/utils/nmeaValidator';

describe('NMEA Validator', () => {
  it('computes correct checksum for simple sentence', () => {
    const s = '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48';
    const cs = computeChecksum(s);
    expect(cs).toBe('48');
    const found = checksumFromSentence(s);
    expect(found).toBe('48');
    const valid = validateChecksum(s);
    expect(valid.ok).toBe(true);
    expect(valid.expected).toBe('48');
  });

  it('detects bad checksum', () => {
    const s = '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*00';
    const valid = validateChecksum(s);
    expect(valid.ok).toBe(false);
    expect(valid.found).toBe('00');
  });

  it('detects missing star', () => {
    const s = '$GPVTG,054.7,T,034.4,M,5.5,N,10.2,K48';
    const struct = validateStructure(s);
    expect(struct.ok).toBe(false);
    expect(struct.errors).toContain('missing-*');
  });

  it('parseAndValidate returns ok for good sentence', () => {
    const s = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
    const r = parseAndValidate(s);
    expect(r.ok).toBe(true);
    expect(r.checksum?.ok).toBe(true);
  });

  it('parseAndValidate flags truncated sentence and bad checksum', () => {
    const s = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*00';
    const r = parseAndValidate(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('checksum-mismatch');
  });
});
