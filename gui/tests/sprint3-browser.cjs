// Chromium real contra HTTP/PostgreSQL QA. Ningún token se guarda en evidencias.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.SCIEM_PLAYWRIGHT_PATH || 'playwright');
const fixture = JSON.parse(fs.readFileSync(process.env.SCIEM_BROWSER_FIXTURE, 'utf8'));
const out = path.resolve('qa-evidence/browser');
fs.mkdirSync(out, { recursive: true });
const origin = 'http://localhost:4173';
const api = 'http://127.0.0.1:8200/api';
const passed = [];
let activePage;
function done(name) { passed.push(name); console.log(`PASS ${name}`); }
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(size.document <= size.viewport + 2, `${name}: overflow horizontal ${JSON.stringify(size)}`);
}
async function session(browser, role, width = 1366) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, permissions: ['camera'] });
  await context.addInitScript(({ token, role }) => {
    if (!localStorage.getItem('qa_initialized')) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_role', role);
      localStorage.setItem('sci_last_activity', Date.now().toString());
      localStorage.setItem('qa_initialized', '1');
    }
  }, { token: fixture.tokens[role], role });
  const page = await context.newPage(); activePage = page;
  page.setDefaultTimeout(20000);
  return { context, page };
}
async function checkResponse(page, method, suffix, action, status = 200) {
  const waiting = page.waitForResponse(r => r.request().method() === method && new URL(r.url()).pathname.endsWith(suffix));
  await action();
  assert.equal((await waiting).status(), status, `${method} ${suffix}`);
}
async function apiJson(context, route, token = fixture.tokens.docente) {
  const response = await context.request.get(`${api}/${route}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status(), 200);
  return response.json();
}
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${process.env.SCIEM_QR_VIDEO}`] });
  try {
    for (const width of [1366, 390]) {
      for (const [role, title] of Object.entries({ admin: 'Administración', docente: 'Docente', auxiliar: 'Auxiliar', estudiante: 'Estudiante' })) {
        const { context, page } = await session(browser, role, width);
        await page.goto(`${origin}/dashboard`);
        await page.getByRole('heading', { name: `Dashboard de ${title}`, exact: true }).waitFor();
        await screenshot(page, `HU20-${role}-${width}`);
        if (role === 'estudiante') await page.getByText('No hay exámenes asociados a tu usuario.').waitFor();
        await context.close();
      }
    }
    done('HU20 cuatro roles desktop/390px y estado vacío');
    {
      const { context, page } = await session(browser, 'estudiante');
      await page.goto(`${origin}/dashboard`);
      await page.getByRole('heading', { name: 'Dashboard de Estudiante', exact: true }).waitFor();
      await page.evaluate(() => localStorage.setItem('user_role', 'admin'));
      await page.reload();
      await page.getByText('El servidor no autorizó este dashboard para el rol de tu sesión.').waitFor();
      assert.equal((await context.request.get(`${api}/usuarios`, { headers: { Authorization: `Bearer ${fixture.tokens.estudiante}` } })).status(), 403);
      await screenshot(page, 'HU20-rol-local-manipulado');
      await context.close();
    }
    {
      const { context, page } = await session(browser, 'admin', 390);
      // La falla SQL real se probó en backend. Aquí se verifica su representación visual.
      await page.route('**/api/dashboard', async route => {
        const response = await route.fetch(); const body = await response.json();
        body.secciones.resumen.aulas_disponibles = null;
        body.errores_secciones = { aulas_disponibles: 'No fue posible cargar esta sección.' };
        await route.fulfill({ response, json: body });
      });
      await page.goto(`${origin}/dashboard`);
      await page.getByText('No disponible', { exact: true }).waitFor();
      await screenshot(page, 'HU20-error-parcial-390');
      await context.close();
    }
    done('HU20 rol local manipulado y presentación de error parcial');
    const { context, page } = await session(browser, 'docente');
    await page.goto(`${origin}/examenes/${fixture.exam}`);
    await page.getByRole('tab', { name: 'Expulsiones', exact: true }).click();
    await page.getByLabel('Filtrar estudiantes con ingreso autorizado').fill(fixture.sis);
    await page.getByRole('button', { name: 'Registrar expulsión', exact: true }).waitFor();
    await screenshot(page, 'HU15-desktop');
    const before = await apiJson(context, `examenes/${fixture.exam}/expulsiones`);
    await page.getByRole('button', { name: 'Registrar expulsión', exact: true }).click();
    await page.locator('#motivo-expulsion').fill('UI motivo de QA');
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar expulsión', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal((await apiJson(context, `examenes/${fixture.exam}/expulsiones`)).total, before.total);
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar expulsión', exact: true }).click();
    await checkResponse(page, 'POST', '/expulsiones', () => page.getByRole('button', { name: 'Confirmar expulsión', exact: true }).click(), 201);
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /Ver motivo de expulsión de José/ }).click();
    await page.getByRole('button', { name: 'Editar motivo', exact: true }).click();
    await page.locator('#editar-motivo-expulsion').fill('UI motivo corregido');
    await page.getByRole('button', { name: 'Guardar cambio', exact: true }).click();
    const id = (await apiJson(context, `examenes/${fixture.exam}/expulsiones?estado=vigentes`)).expulsiones[0].id;
    await checkResponse(page, 'PATCH', `/expulsiones/${id}`, () => page.getByRole('button', { name: 'Confirmar edición', exact: true }).click());
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByLabel('Motivo de eliminación', { exact: true }).fill('UI baja autorizada');
    await checkResponse(page, 'DELETE', `/expulsiones/${id}`, () => page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click());
    await screenshot(page, 'HU15-baja-auditada');
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.getByRole('tab', { name: 'Expulsiones', exact: true }).click();
    await page.getByLabel('Estado de expulsión').selectOption('eliminadas');
    await page.getByText('UI motivo corregido', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, 'HU15-historial-390');
    done('HU15 cancelar/registrar/editar/eliminar y recarga de historial');

    // La cámara virtual entrega un QR firmado real al decodificador html5-qrcode.
    await page.setViewportSize({ width: 1366, height: 900 });
    const countBeforeQr = (await apiJson(context, `examenes/${fixture.exam}/expulsiones`)).total;
    await page.getByRole('button', { name: 'Escanear código QR', exact: true }).click();
    await page.getByRole('dialog', { name: 'Registro de expulsión' }).waitFor({ timeout: 30000 });
    assert.equal((await apiJson(context, `examenes/${fixture.exam}/expulsiones`)).total, countBeforeQr);
    await screenshot(page, 'HU15-QR-camara-virtual');
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    done('HU15 cámara virtual decodifica QR firmado sin registrar expulsión');

    await page.getByRole('tab', { name: 'Monitoreo', exact: true }).click();
    await page.getByRole('heading', { name: 'Monitoreo de asistencia', exact: true }).waitFor();
    await page.locator('[aria-label="Indicadores de asistencia"]').getByText('300', { exact: true }).waitFor();
    await screenshot(page, 'HU16-desktop');
    const activityBefore = await page.evaluate(() => localStorage.getItem('sci_last_activity'));
    await page.waitForResponse(r => r.url().includes('/monitoreo?'), { timeout: 20000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('sci_last_activity')), activityBefore, 'Polling renueva actividad');
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, 'HU16-390');
    // Simula evento de visibilidad y comprueba que el planificador deja de consultar.
    let requests = 0;
    const countMonitor = r => { if (r.url().includes('/monitoreo?')) requests++; };
    page.on('request', countMonitor);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(16500);
    assert.equal(requests, 0, 'Polling continúa oculto');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForResponse(r => r.url().includes('/monitoreo?'), { timeout: 20000 });
    page.off('request', countMonitor);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Actualizar ahora', exact: true }).click();
    await page.getByRole('alert').first().waitFor();
    await screenshot(page, 'HU16-error-red');
    await context.setOffline(false);
    await checkResponse(page, 'GET', '/monitoreo', () => page.getByRole('button', { name: 'Actualizar ahora', exact: true }).click());
    await page.goto(`${origin}/examenes/${fixture.empty_exam}`);
    await page.getByRole('tab', { name: 'Monitoreo', exact: true }).click();
    await page.locator('[aria-label="Indicadores de asistencia"]').getByText('0', { exact: true }).first().waitFor();
    await screenshot(page, 'HU16-cambio-examen-vacio');
    done('HU16 polling, visibilidad simulada, recuperación de red y cambio de examen');

    await page.goto(`${origin}/reportes`);
    await page.locator('#reporte-examen').selectOption(fixture.exam);
    await page.locator('[aria-label="Reporte del examen"]').waitFor();
    await screenshot(page, 'HU17-390');
    await page.setViewportSize({ width: 1366, height: 900 });
    await screenshot(page, 'HU17-desktop');
    for (const format of ['xlsx', 'pdf']) {
      await page.locator('#formato-reporte').selectOption(format);
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Descargar reporte', exact: true }).click();
      await (await download).saveAs(path.join(out, `descarga-ui.${format}`));
    }
    await page.locator('#fecha-desde').fill('2099-01-01');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await page.getByText('Filtros activos', { exact: true }).waitFor();
    await screenshot(page, 'HU17-sin-resultados');
    await context.close();
    done('HU17 desktop/390px, filtros y descargas reales XLSX/PDF');

    // Timer de 5 minutos con reloj controlado; el polling no mantiene viva la sesión.
    const idle = await session(browser, 'docente');
    await idle.page.clock.install();
    await idle.page.goto(`${origin}/examenes/${fixture.exam}`);
    await idle.page.getByRole('tab', { name: 'Monitoreo', exact: true }).click();
    await idle.page.getByRole('heading', { name: 'Monitoreo de asistencia', exact: true }).waitFor();
    await idle.page.clock.fastForward(240001);
    await idle.page.getByRole('dialog').waitFor();
    await screenshot(idle.page, 'HU16-aviso-inactividad');
    await idle.page.clock.runFor(61000);
    await idle.page.waitForURL('**/login');
    assert.equal(await idle.page.evaluate(() => localStorage.getItem('auth_token')), null);
    await idle.context.close();
    done('inactividad 5 minutos con reloj controlado y logout real');
    fs.writeFileSync(path.join(out, 'resultados.json'), JSON.stringify({ passed, limits: ['Cámara virtual; hardware físico no evaluado.', 'Visibilidad y tiempo controlados por Playwright.'] }, null, 2));
  } catch (error) {
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(out, 'FAIL.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(out, 'fallo.txt'), String(error.stack || error));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
