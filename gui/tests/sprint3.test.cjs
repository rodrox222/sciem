const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

function load(file, api = {}) {
  const filename = path.join(__dirname, '..', file)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const result = { exports: {} }
  vm.runInNewContext(code, { exports: result.exports, module: result, require: () => ({ api }), URLSearchParams, Intl, Date, Map, Set, Error }, { filename })
  return result.exports
}

test('horario Bolivia: medianoche, límites y examen terminado', () => {
  const { verificarHorarioExpulsion: check } = load('src/components/examenes/horarioExpulsion.ts')
  const exam = { fecha: '2026-10-28', hora_ini: '23:00', hora_fin: '01:00', estado: 'En proceso' }
  assert.equal(check(exam, new Date('2026-10-29T03:00:00Z')).permitido, true)
  assert.equal(check(exam, new Date('2026-10-29T05:00:00Z')).permitido, true)
  assert.equal(check(exam, new Date('2026-10-29T05:00:01Z')).permitido, false)
  assert.equal(check({ ...exam, estado: 'Terminado' }, new Date('2026-10-29T04:00:00Z')).permitido, false)
})

test('monitoreo rechaza alumno en ambos estados y totales incompatibles', () => {
  const { construirListasMonitoreo: build, validarResumenYListas: validate } = load('src/services/monitoreo.service.ts')
  const item = { id: 'a', nombre: 'José', apellido_paterno: 'Pérez', codigo_sis: '001', fecha_ingreso: null }
  const list = (estado, estudiantes) => ({ examen: { id: 'exam' }, estado, estudiantes })
  assert.throws(() => build(list('ingresados', [item]), list('ausentes', [item])), /ambos estados/)
  const lists = build(list('ingresados', [item]), list('ausentes', []))
  assert.equal(lists.ingresados[0].sis, '001')
  assert.throws(() => validate({ inscritos: 2, ingresados: 1, ausentes: 1 }, lists), /no coinciden/)
})

test('snapshot transporta revisión y cancelación, acepta cambios sin cambiar conteos', async () => {
  const calls = []
  const signal = { aborted: false }
  let name = 'Ana'
  const api = { get: async (url, options) => {
    calls.push({ url, options })
    return { examen: { id: 'exam' }, revision: name, resumen: { total_estudiantes: 1, total_ingresados: 0, total_ausentes: 1 }, listas: { ingresados: [], ausentes: [{ id: 'a', nombre: name, codigo_sis: '001' }] } }
  } }
  const service = load('src/services/monitoreo.service.ts', api).monitoreoService
  const first = await service.snapshot('exam', '', signal)
  name = 'María'
  const second = await service.snapshot('exam', first.revision, signal)
  assert.equal(second.listas.ausentes[0].nombre, 'María')
  assert.equal(calls[1].options.signal, signal)
  assert.match(calls[1].url, /revision=Ana/)
})

test('HU15 identificar solo usa GET y eliminar envía motivo, sin registrar ingreso', async () => {
  const calls = []
  const api = Object.fromEntries(['get', 'post', 'delete'].map(method => [method, async (...args) => { calls.push({ method, args }); return {} }]))
  const service = load('src/services/expulsiones.service.ts', api).expulsionesService
  await service.identificar('exam', 'payload.signature')
  await service.eliminar('exam', 'expulsion', '  Registro equivocado  ')
  assert.equal(calls[0].method, 'get')
  assert.match(calls[0].args[0], /expulsiones\/estudiantes\?qr_data=/)
  assert.equal(calls[1].method, 'delete')
  assert.equal(JSON.parse(calls[1].args[1].body).motivo_eliminacion, 'Registro equivocado')
  assert.equal(calls.some(c => c.method === 'post'), false)
})
