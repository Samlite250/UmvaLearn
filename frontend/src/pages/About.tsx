import { Link } from 'react-router-dom'
import { PageContent } from '@/components/PageContent'

export default function About() {
    return <PageContent title="About UmvaLearn" intro="Read, listen, and understand in English, French, and Kinyarwanda.">
        <section><h2>Study in the way that works for you</h2><p>UmvaLearn brings translation, text to speech, and speech to text into one study space. Choose your study level to tailor explanations for primary, secondary, or university learning.</p></section>
        <section><h2>Your study tools</h2><ul className="list-disc space-y-2 pl-5"><li><Link to="/tools/translate">Translate</Link> text between the three supported languages.</li><li><Link to="/tools/tts">Text to Speech</Link> turns written material into audio.</li><li><Link to="/tools/stt">Speech to Text</Link> turns recordings into editable transcripts.</li></ul></section>
        <section><h2>Keep your work together</h2><p>Recent activity appears in <Link to="/history">History</Link>. Sign in to save study material to <Link to="/library">My Library</Link>. Guest history stays in this browser.</p></section>
        <section><h2>Learning with AI</h2><p>Translations, transcripts, and explanations can contain mistakes. Check important material against your lessons and ask a teacher or fluent speaker when you are unsure.</p><p className="mt-2"><Link to="/help">Learn how to get started →</Link></p></section>
    </PageContent>
}
