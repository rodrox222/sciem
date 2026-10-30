const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

function serviceHarness() {
  const calls = []
  const api = {
    get: async (url, options) => {
      calls.push({ kind: 'get', url, options })
      return { examen: { id: 'abc' } }
    },
  }
  const apiDownload = async (url, options) => {
    calls.push({ kind: 'download', url, options })
    return { blob: new Blob(['%PDF-']) }
  }
  const file = fs.readFileSync(path.join(__dirname, '../src/services/reportes.service.ts'), 'utf8')
  const js = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, {
    module: mod,
    exports: mod.exports,
    require: () => ({ api, apiDownload }),
    URLSearchParams,
  })
  return { service: mod.exports.reportesService, query: mod.exports.queryReporte, calls }
}

test('HU17 reportes: descargar completo y tres informes por separado con filtros iguales', async () => {
  const { service, calls } = serviceHarness()
  const filtros = { fecha_desde: '2026-10-20', fecha_hasta: '2026-10-29' }
  const rutas = {
    completo: 'estadisticas/descargar',
    acta: 'acta-disciplinaria/descargar',
    auditoria: 'auditoria-puerta/descargar',
    matriz: 'matriz-habilitacion-asistencia/descargar',
  }
  const signal = { aborted: false }
  for (const [tipo, ruta] of Object.entries(rutas)) {
    await service.descargar('exam/uuid', filtros, 'xlsx', signal, tipo)
    const last = calls.at(-1)
    assert.equal(last.kind, 'download')
    assert.ok(last.url.includes('/examenes/exam%2Fuuid/reportes/' + ruta + '?'))
    const q = new URL('https://sciem.test' + last.url).searchParams
    assert.equal(q.get('formato'), 'xlsx')
    assert.equal(q.get('fecha_desde'), filtros.fecha_desde)
    assert.equal(q.get('fecha_hasta'), filtros.fecha_hasta)
    assert.equal(last.options.signal, signal)
  }
  await service.descargar('exam', { fecha_desde: '', fecha_hasta: '' }, 'pdf', undefined, 'acta')
  assert.match(calls.at(-1).url, /acta-disciplinaria\/descargar\?formato=pdf$/)
})

test('HU17 cuatro graficos: endpoint recibe intervalo 5/10 y filtros por examen', async () => {
  const { service, calls } = serviceHarness()
  await service.graficos('exam', { fecha_desde: '2026-10-28', fecha_hasta: '' }, 5)
  let url = new URL('https://sciem.test' + calls.at(-1).url)
  assert.equal(url.pathname, '/examenes/exam/reportes/estadisticas/graficos')
  assert.equal(url.searchParams.get('intervalo'), '5')
  assert.equal(url.searchParams.get('fecha_desde'), '2026-10-28')
  await service.graficos('exam', { fecha_desde: '', fecha_hasta: '2026-10-28' }, 10)
  url = new URL('https://sciem.test' + calls.at(-1).url)
  assert.equal(url.searchParams.get('intervalo'), '10')
  assert.equal(url.searchParams.get('fecha_hasta'), '2026-10-28')
})

test('HU17 graficas no inventan porcentajes con total cero ni mezclan personas y eventos', () => {
  const file = fs.readFileSync(path.join(__dirname, '../src/components/reportes/GraficosValidacion.tsx'), 'utf8')
  assert.match(file, /curva_flujo\.intervalos/)
  assert.match(file, /embudo/)
  assert.match(file, /cumplimiento_prerrequisitos/)
  assert.match(file, /distribucion_asistencia/)
  assert.match(file, /Los segmentos no suman el total de inscritos/)
  assert.match(file, /escaneos \(eventos\), no personas únicas/)
})

test('HU17 selectores: no ofrecen CSV sin contrato y mantienen PDF/XLSX', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/ReportesEstadisticosPage.tsx'), 'utf8')
  for (const tipo of ['completo', 'acta', 'auditoria', 'matriz']) assert.match(src, new RegExp('<option value="' + tipo + '"'))
  for (const formato of ['pdf', 'xlsx']) assert.match(src, new RegExp('<option value="' + formato + '"'))
  assert.doesNotMatch(src, /<option value="csv">/)
})
