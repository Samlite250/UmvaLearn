import { Link } from 'react-router-dom'
import { PageContent } from '@/components/PageContent'

export default function Help() {
    return <PageContent title="Help & getting started" intro="A practical guide to your UmvaLearn study tools.">
        <section><h2>Translate text</h2><p>Open <Link to="/tools/translate">Translate</Link>, choose the source and target languages, enter your text, and select Translate. You can also record or upload speech. Use Generate spoken output to listen to a result.</p></section>
        <section><h2>Listen to your notes</h2><p>In <Link to="/tools/tts">Text to Speech</Link>, choose the input and output languages, select a voice, and enter your text. Generate audio, then use the playback controls. Different input and output languages translate your text before speaking it.</p></section>
        <section><h2>Transcribe speech</h2><p>In <Link to="/tools/stt">Speech to Text</Link>, choose the spoken language and allow microphone access when prompted. Record, stop, and select Transcribe. Review and edit the transcript before saving or generating spoken output. Use a short recording; hosted upload limits may be lower than local limits.</p></section>
        <section><h2>Study levels and dashboard tabs</h2><p>Choose your level on the <Link to="/welcome">welcome screen</Link> or in the desktop navigation. The <Link to="/home">dashboard</Link> tabs switch between all three tools without leaving the page. Explanation buttons use your selected study level.</p></section>
        <section><h2>Accounts and saved work</h2><p><Link to="/auth/signup">Create an account</Link> or <Link to="/auth/signin">sign in</Link> to use My Library. Check your email if confirmation is required. Use <Link to="/auth/reset">Reset password</Link> if you cannot sign in. History records recent activity; Library contains items you explicitly save.</p></section>
        <section><h2>If something goes wrong</h2><ul className="list-disc space-y-2 pl-5"><li>Microphone access requires HTTPS and browser permission. Check your browser's site permissions.</li><li>If audio does not play, check your volume and press Play in the audio controls.</li><li>For a provider or quota error, read the message, keep a copy of your text, and try again later. Availability depends on the configured services.</li><li>Do not upload passwords, private records, or material you do not have permission to share.</li></ul></section>
    </PageContent>
}
