import assert from 'node:assert/strict'
import { test } from 'node:test'
import { textSegments, LANGUAGES, translate } from './runtime.mjs'

test('all app languages map to NLLB codes and short chunks preserve Unicode text', () => {
    assert.deepEqual(LANGUAGES, { en: 'eng_Latn', fr: 'fra_Latn', rw: 'kin_Latn' })
    for (const text of ['Hello world. '.repeat(100), '\u{1F600}'.repeat(300), 'a'.repeat(900)]) {
        const chunks = textSegments(text)
        assert.equal(chunks.join(''), text)
        assert.ok(chunks.every(chunk => chunk.length <= 300))
        assert.ok(chunks.every(chunk => !/[\uD800-\uDBFF]$/.test(chunk)))
    }
})

test('local runtime preserves spacing and sends explicit source and target language codes', async () => {
    const translator = async (text, options) => {
        assert.equal(text, 'Hello')
        assert.equal(options.src_lang, 'eng_Latn')
        assert.equal(options.tgt_lang, 'kin_Latn')
        return [{ translation_text: 'Muraho' }]
    }
    assert.equal(await translate(translator, ' Hello\n', 'en', 'rw'), ' Muraho\n')
    assert.equal(await translate(translator, 'Hello', 'en', 'en'), 'Hello')
    await assert.rejects(translate(translator, 'Hello', 'en', 'unknown'), /Unsupported/)
})

