import { Link } from 'react-router-dom'
import { PageContent } from '@/components/PageContent'

export default function Terms() {
    return <PageContent title="Terms of use" intro="Guidelines for using UmvaLearn as a study assistant.">
        <section><h2>Use the tools responsibly</h2><p>Use UmvaLearn for material you are allowed to process and share. Do not use it to harass others, impersonate someone, upload recordings without permission, or interfere with the service.</p></section>
        <section><h2>Review generated results</h2><p>AI output can be incomplete or incorrect, especially for names, specialist vocabulary, and translations. Review results before using them in schoolwork. Follow your institution's rules about AI assistance and academic integrity.</p></section>
        <section><h2>Your account and content</h2><p>Keep your password private and sign out on shared devices. Saving material does not grant permission to redistribute someone else's work. Keep your own copy of important notes and recordings.</p></section>
        <section><h2>Availability</h2><p>Features depend on network access, browser permissions, and external providers. Usage limits, service interruptions, or configuration changes can make features unavailable. UmvaLearn is a learning aid and does not guarantee the accuracy or availability of generated results.</p></section>
        <section><h2>Privacy and support</h2><p>Read <Link to="/privacy">Privacy</Link> before submitting personal information. See <Link to="/help">Help</Link> for feature instructions and troubleshooting.</p></section>
    </PageContent>
}
