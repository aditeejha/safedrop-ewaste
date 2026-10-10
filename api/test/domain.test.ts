import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handoverCode, isHandoverCode, newId } from '../src/lib/codes.js'
import { criticalStepIds, findGuide, guides } from '../src/lib/guides.js'
import { co2eAvoidedKg, energySavedKwh, itemImpact, ledHours, metalsRecoverableGrams, sumImpact, typicalKg } from '../src/lib/impact.js'
import { guideFor, holdsData } from '../src/lib/kinds.js'
import { shortName } from '../src/routes/public.js'
import { withCitations } from '../src/lib/assistant.js'

test('handover codes avoid ambiguous characters and validate', () => {
  for (let i = 0; i < 200; i++) {
    const code = handoverCode()
    assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/)
    assert.ok(isHandoverCode(code))
  }
  assert.equal(isHandoverCode('ABC10O'), false)
  assert.match(newId('bk'), /^bk-[0-9a-f]{12}$/)
})

test('guides are picked by kind, brand and OS', () => {
  assert.equal(guideFor('phone', 'Samsung', 'android'), 'samsung')
  assert.equal(guideFor('phone', 'Apple', null), 'iphone')
  assert.equal(guideFor('tablet', null, 'ipados'), 'iphone')
  assert.equal(guideFor('phone', 'Redmi', null), 'android')
  assert.equal(guideFor('laptop', 'Apple', null), 'mac')
  assert.equal(guideFor('laptop', 'HP', 'chromeos'), 'chromebook')
  assert.equal(guideFor('desktop', 'Dell', null), 'windows')
  assert.equal(guideFor('router', null, null), 'tv-router-printer')
  assert.equal(guideFor('charger', null, null), null)
  assert.equal(holdsData('charger'), false)
  assert.equal(holdsData('storage'), true)
})

test('every guide referenced by guideFor exists and has critical steps', () => {
  for (const id of ['android', 'samsung', 'iphone', 'windows', 'mac', 'chromebook', 'feature-phone', 'storage', 'tv-router-printer']) {
    const guide = findGuide(id)
    assert.ok(guide, id)
    assert.ok(criticalStepIds(guide).length > 0, id)
  }
  assert.ok(guides.every((g) => g.sections.every((s) => s.sources.length > 0)))
})

test('CO2e uses WARM landfilling minus recycling per short ton', () => {
  // Portable electronics: 0.02 - (-1.06) = 1.08 t per short ton; 1 short ton = 907.18474 kg
  assert.equal(co2eAvoidedKg('phone', 907.18474), 1080)
  assert.equal(co2eAvoidedKg('phone', 0.09), 0.11)
  assert.equal(co2eAvoidedKg('desktop', 8.77), 14.6)
  assert.equal(co2eAvoidedKg('battery', 1), 0)
})

test('energy uses WARM energy factors converted with 293.07107 kWh per million Btu', () => {
  // Portable electronics: 0.27 - (-20.95) = 21.22 million Btu per short ton
  assert.equal(energySavedKwh('phone', 907.18474), Math.round(21.22 * 293.07107 * 100) / 100)
  assert.equal(energySavedKwh('phone', 0.09), 0.62)
  assert.equal(energySavedKwh('desktop', 8.77), 60.86)
  assert.equal(energySavedKwh('battery', 1), 0)
  assert.equal(ledHours(0.62), 69)
})

test('metals are only reported for cell phones', () => {
  assert.deepEqual(metalsRecoverableGrams('phone'), { copper: 16, silver: 0.35, gold: 0.034, palladium: 0.015 })
  assert.equal(metalsRecoverableGrams('laptop'), null)
  assert.equal(typicalKg('phone'), 0.09)
  assert.equal(typicalKg('charger'), null)
})

test('impact totals add up', () => {
  const a = { kg: 0.2, ...itemImpact('phone', 0.2) }
  const b = { kg: 1.5, ...itemImpact('laptop', 1.5) }
  const total = sumImpact([a, b])
  assert.equal(total.kg, 1.7)
  assert.equal(total.co2eKg, Math.round((a.co2eKg + b.co2eKg) * 100) / 100)
  assert.equal(total.energyKwh, Math.round((a.energyKwh + b.energyKwh) * 100) / 100)
  assert.equal(total.metalsGrams.gold, 0.034)
})

test('certificate names are shortened for privacy', () => {
  assert.equal(shortName('Priya Sharma (Demo)'), 'Priya S.')
  assert.equal(shortName('Aditee Jha'), 'Aditee J.')
  assert.equal(shortName('Ramesh'), 'Ramesh')
  assert.equal(shortName('(Demo)'), 'A SafeDrop user')
})

test('helper citations are renumbered to match the returned sources', () => {
  const sources = Array.from({ length: 30 }, (v, i) => ({ title: `S${i + 1}`, publisher: 'P', url: `https://x/${i + 1}` }))
  const result = withCitations('Remove the account [27]. Then reset [28][27]. Ignore [99].', sources)
  assert.equal(result.answer, 'Remove the account [1]. Then reset [2][1]. Ignore .')
  assert.deepEqual(result.sources.map((s) => s.title), ['S27', 'S28'])
})
