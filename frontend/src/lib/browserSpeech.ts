import type { ContentLanguage } from './types'

/** Only use a matching voice: never read Kinyarwanda with an English voice. */
export async function speechVoice(language: ContentLanguage): Promise<SpeechSynthesisVoice | undefined> {
    if (!('speechSynthesis' in window)) return undefined
    const synth = window.speechSynthesis
    if (!synth.getVoices().length) await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', done); resolve() }
        const timer = setTimeout(done, 1500)
        synth.addEventListener('voiceschanged', done)
    })
    return synth.getVoices().find(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === language)
}

export function speak(text: string, voice: SpeechSynthesisVoice, onEnd: () => void, onError: () => void, rate = 1, volume = 1) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = rate
    utterance.volume = volume
    utterance.onend = onEnd
    utterance.onerror = event => { if (event.error !== 'canceled' && event.error !== 'interrupted') onError() }
    window.speechSynthesis.speak(utterance)
}
