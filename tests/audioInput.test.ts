import { it, expect } from 'vitest';
import { audioInputSchema, detectAudioContainer } from '../lib/audioInput';
it('valida identificadores sem aceitar caminhos', () => {
 expect(audioInputSchema.safeParse({alunoId:'../outro',textoId:'t1'}).success).toBe(false);
 expect(audioInputSchema.safeParse({alunoId:'a1',textoId:'t1',isForeigner:'anything'}).success).toBe(false);
});
it('não confia no nome ou MIME do upload', () => expect(detectAudioContainer(new TextEncoder().encode('not a real audio file'))).toBeNull());
it('reconhece um cabeçalho WAV', () => expect(detectAudioContainer(new TextEncoder().encode('RIFF0000WAVEdata'))).toBe('wav'));
