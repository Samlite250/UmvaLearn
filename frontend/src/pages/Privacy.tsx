import { Link } from 'react-router-dom'
import { PageContent } from '@/components/PageContent'

export default function Privacy() {
    return <PageContent title="Privacy" intro="How the current app handles your study material and account information.">
        <section><h2>Information you provide</h2><p>Account registration uses your email address, display name, and password through Supabase Authentication. Signed-in study history and saved Library items are stored in the app's Supabase database. Saved audio may also use Supabase Storage.</p></section>
        <section><h2>Storage in your browser</h2><p>Language and study-level preferences, guest history, and authentication session information use browser storage. Guest history is specific to this browser. Signing out does not automatically clear guest history or preferences.</p></section>
        <section><h2>Processing text and audio</h2><p>When you request translation, transcription, speech, or an explanation, the relevant text or audio is sent to the app's API and its configured provider. Depending on deployment settings, providers can include OpenAI, ElevenLabs, Pindo, MyMemory, or a separate translation service. Their processing and retention practices apply to material sent to them. Production requests should not be assumed to remain on your device.</p></section>
        <section><h2>Microphone and uploads</h2><p>Recording starts when you choose the record control and grant permission. Recorded or uploaded audio is submitted when you use a transcription feature. Avoid sharing sensitive personal information or another person's recording without permission.</p></section>
        <section><h2>Manage your study data</h2><p>Delete individual items in <Link to="/library">My Library</Link> and individual entries or all entries in <Link to="/history">History</Link>. Deleting history does not delete separately saved Library items. Clearing browser storage removes local preferences and guest history, but does not delete server-side account data.</p></section>
        <section><h2>Hosting and account requests</h2><p>The site is hosted on Vercel; hosting and provider logs may contain operational request information. Account deletion is not currently available through the app. Contact the person or institution that provided your UmvaLearn account for account-level requests. This page describes current functionality and will need updating as services change.</p></section>
    </PageContent>
}
