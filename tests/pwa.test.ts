import { it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
it('fornece todos os recursos do manifesto', () => {
 const manifest = JSON.parse(readFileSync('public/manifest.json','utf8'));
 for (const icon of manifest.icons) expect(existsSync('public' + icon.src)).toBe(true);
 expect(existsSync('public/offline.html')).toBe(true);
});
it('não intercepta API, credenciais ou origens externas', () => {
 const listeners: Record<string, (event: any) => void> = {};
 const self = { location:{origin:'https://school.test'}, addEventListener:(name: string, fn: any)=>listeners[name]=fn };
 vm.runInNewContext(readFileSync('public/sw.js','utf8'), {self, URL});
 for (const url of ['https://school.test/api/health','https://outside.test/icon-192.png']) {
   const respondWith = vi.fn();
   listeners.fetch({request:{url,method:'GET',mode:'cors',headers:new Headers()},respondWith});
   expect(respondWith).not.toHaveBeenCalled();
 }
 const respondWith = vi.fn();
 listeners.fetch({request:{url:'https://school.test/icon-192.png',method:'GET',mode:'cors',
   headers:new Headers({authorization:'Bearer secret'})},respondWith});
 expect(respondWith).not.toHaveBeenCalled();
});
