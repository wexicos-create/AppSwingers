import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Capacitor uses a stable AppSwinger Android package id', async () => {
  const config = await readFile(new URL('../capacitor.config.ts', import.meta.url), 'utf8');
  assert.match(config, /appId:\s*'com\.appswinger\.app'/);
  assert.match(config, /appName:\s*'AppSwinger'/);
  assert.match(config, /webDir:\s*'dist'/);
});

test('deposit image is explicitly a demo and never claims a real transfer', async () => {
  const image = await readFile(new URL('../public/deposit-demo-mx.svg', import.meta.url), 'utf8');
  assert.match(image, /EJEMPLO ILUSTRATIVO/);
  assert.match(image, /NO PAGAR A ESTOS DATOS/);
  assert.match(image, /SIN OPERACIÓN REAL/);
  assert.match(image, /REFERENCIA/);
});

test('Android workflow uploads an APK only after Gradle build', async () => {
  const workflow = await readFile(new URL('../.github/workflows/validate-and-android.yml', import.meta.url), 'utf8');
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /app-debug\.apk/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm run test/);
});
