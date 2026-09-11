import { z } from 'zod';
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const audioInputSchema = z.object({
  alunoId: z.string().regex(/^[\w-]{1,128}$/),
  textoId: z.string().regex(/^[\w-]{1,128}$/),
  isForeigner: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  isGlassesUser: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
});
export function detectAudioContainer(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'webm';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';
  if (ascii(4, 8) === 'ftyp') return 'm4a';
  if (ascii(0, 4) === 'OggS') return 'ogg';
  if (ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return 'mp3';
  return null;
}
