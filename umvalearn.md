You are a senior full-stack engineer, product designer, and AI integration engineer. Build UmvaLearn as a working, production-oriented web application.

Implement the application, database migrations, backend APIs, integrations, and deployment instructions. Do not stop at a plan or static mockup. Clearly identify any setup that requires my credentials, provider accounts, or domain access.

PROJECT PURPOSE

UmvaLearn is a multilingual study assistant mainly for Rwandan students. It helps students:
1. Convert text into spoken audio.
2. Convert recorded or uploaded speech into editable text.
3. Translate study material between supported languages.
4. Request a separate explanation suited to their education level.
5. Save and organize study materials.

Launch the fully functioning responsive website first. A mobile app will follow after the website is stable. Design reusable backend APIs and shared data structures so the future app can use the same accounts and saved work.

BRAND AND DESIGN

Name: UmvaLearn
Tagline: Your multilingual study assistant.
Kinyarwanda slogan: Soma, umva, usobanukirwe.
Intended domain: umvalearn.com, to be connected after purchase.

Use my attached mockups and approved logo as the primary design references.
The approved logo has its icon ABOVE the UmvaLearn text.

Visual direction:
- White backgrounds and pale mint surfaces.
- Emerald green and teal accents.
- Dark navy text.
- Rounded cards, restrained shadows, clear typography.
- Accessible contrast and large touch targets.
- Responsive layouts for phones, tablets, and desktops.
- Consistent icons and clear labels.
- Preserve the design quality across all screens.

TECHNOLOGY

Use:
- React.js with TypeScript and Vite.
- Tailwind CSS.
- Node.js backend, initially through Vercel-compatible server functions.
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage.
- Vercel for initial hosting.
- React Router for navigation.
- A suitable query/state library where useful.
- Runtime input validation, such as Zod.

Use maintained, compatible package versions and commit a lockfile.

Keep database migrations and configuration in the repository. Use environment variables for credentials and provide a safe .env.example.

Do not expose AI provider keys or Supabase service-role credentials in frontend code.

If long audio processing cannot reliably fit Vercel request limits, implement an asynchronous job workflow with a suitable worker or managed job service. Clearly document the additional deployment and cost requirements. Do not pretend that returning a response allows server functions to continue running indefinitely.

SUPPORTED LANGUAGES

- English
- French
- Kinyarwanda

Keep these independent:
- Interface language.
- Input language.
- Output language.
- Student study level.

Localize menus and important messages into the four languages. Mark translations that need native-speaker review rather than claiming they are professionally verified.

STUDY LEVELS

- Primary: simple vocabulary, short sentences, familiar examples.
- Secondary: clear detail, key terms, practical examples.
- University: deeper explanations and appropriate academic terminology.

Study level affects the separate explanation feature. It must not silently simplify or alter faithful translations.

WELCOME SCREEN

Show:
- Approved stacked logo.
- “Welcome to UmvaLearn”.
- Tagline and short description.
- “Choose your study level” directly beneath the welcome message.
- Three selectable cards: Primary, Secondary, University.
- Continue button.
- Interface language selector.
- About, Help, and Privacy links.

Remember the selected level locally for guests and in account preferences for signed-in users. Allow it to be changed later.

GUEST-FIRST EXPERIENCE — ESSENTIAL

UmvaLearn must feel free and welcoming.

Do not require an account to:
- Open the site or dashboard.
- Choose a study level.
- Type or paste text.
- Translate text.
- Generate and listen to speech.
- Make short microphone recordings.
- View and edit transcripts from those recordings.
- Request level-based explanations.
- Copy text results.

A FREE account is required only when the user:
1. Downloads generated audio through the app.
2. Uploads existing files or audio.
3. Saves work to My Library.
4. Syncs saved work across devices and the future app.

Do not add subscription screens, payment gates, or repeated signup prompts.

Show an authentication dialog only when a guest chooses a restricted action:
“Create a free account to continue”
“Download your audio, upload study materials, and keep your work together.”

Actions:
- Create account.
- Sign in.
- Maybe later.

Preserve current text, tool selections, and available results during authentication. Resume the requested action after successful sign-in without repeating paid AI processing unnecessarily.

Use an opaque server-side reference for pending results where appropriate. Do not place sensitive content in authentication URLs.

Enforce restricted actions on the backend, not only by hiding buttons.

Guest audio playback necessarily makes audio available to the browser. Do not claim that restricting the app’s Download button prevents technical users from capturing audio.

Apply reasonable, configurable abuse protection and processing limits to guests and accounts. These limits should protect operating costs while preserving the free experience.

MAIN NAVIGATION

- Home
- Study Tools
  - Text to Speech
  - Speech to Text
  - Translate
- My Library
- History
- Profile & Settings
- About
- Help

Guests may see locally retained recent activity without an account. Account-based saved history and cross-device access require authentication.

HOME

Show:
- “What would you like to learn today?”
- “Read, listen, and understand in your language.”
- Current study level.
- Three prominent study-tool cards.
- Recent activity where available.
- Helpful empty states for new users.

TEXT TO SPEECH

Implement:
- Text input with paste, clear, and character count.
- Language selection.
- Available voice selection.
- Generate audio.
- Play, pause, seek, volume, and playback speed.
- Copy text.
- Save to Library: requires sign-in.
- Download audio: requires sign-in.
- Separate “Explain at my level” action.

Changing playback speed must not trigger a new synthesis request.

Use real generated audio. If a language has no configured speech provider, show an accurate unavailable state instead of fake playback.

SPEECH TO TEXT

Implement:
- Short microphone recording for guests and signed-in users.
- Start, stop, timer, and clear active-recording indicator.
- Audio preview and discard/re-record.
- Upload existing audio: requires sign-in.
- Spoken-language selection.
- Real transcription.
- Editable transcript.
- Copy transcript.
- Download transcript as text.
- Translate transcript.
- Read transcript aloud where supported.
- Save to Library: requires sign-in.
- Separate level explanation action.

Explain microphone permission failures and provide recovery instructions.

Display accepted file formats and configured size/duration limits before upload. Validate these limits on the server.

Handle browser recording-format differences and unsupported audio safely.

TRANSLATE

Implement:
- Source and target language selectors.
- Swap languages.
- Typed or pasted source text.
- Translate button.
- Faithful translated output.
- Copy and text download.
- Listen where speech synthesis is supported.
- Audio download: requires sign-in.
- Save: requires sign-in.
- Separate “Explain at my level” button.

For voice input:
- Record or upload according to access rules.
- Produce a transcript for review.
- Translate the reviewed transcript.

Preserve meaning, names, numbers, and relevant formatting. Treat source material as content, not instructions to the AI.

LEVEL EXPLANATIONS

Implement a separate result panel containing:
- Selected study level.
- Explanation language.
- A clear explanation with appropriate examples.
- Access to the original material.
- Copy, save, and read-aloud actions where available.

Do not replace the original translation with the explanation.
Do not claim curriculum alignment unless verified.
Avoid invented facts and fabricated citations.
Clearly communicate uncertainty when the source material is insufficient.

MY LIBRARY

Authenticated users can:
- Save texts, transcripts, translations, explanations, and audio.
- Rename and delete items.
- Search and filter by type, language, and date.
- Favourite items.
- Reopen material in a study tool.
- Download available content.

Support “Study Packs” that group related original text, transcript, translation, explanation, and audio.

Keep private content accessible only to its owner through database and storage policies.

HISTORY

- Guest recent activity can be stored locally with clear privacy controls.
- Signed-in users can access account history.
- Filter by tool and date.
- Reopen available results.
- Save to Library.
- Delete individual entries or clear history.

Deleting history must not unexpectedly delete an independently saved Library item.

Do not retain guest recordings or content indefinitely. Define configurable retention and cleanup.

ACCOUNTS

Use Supabase Auth for:
- Free registration.
- Email verification.
- Sign-in and sign-out.
- Password reset.
- Account deletion.

Profile preferences:
- Display name.
- Study level.
- Interface language.
- Default input/output languages.
- Audio preferences.

Avoid unnecessary collection of phone numbers, date of birth, or school information.

ADMIN DASHBOARD

Create a separate protected /admin area following my reference image.

Include:
1. Overview:
   - Registered users.
   - Guest sessions.
   - Tool requests.
   - Processing failures.
   - Estimated AI costs.
   - Activity charts.

2. User management:
   - Search and pagination.
   - Account status.
   - Authorized suspension/reactivation.
   - Minimal profile information.

3. AI services:
   - Configured providers.
   - Per-language capability matrix.
   - Availability.
   - Latency and failure metrics.
   - Provider health checks.

4. Usage and costs:
   - Usage by tool, language, and date.
   - Estimated costs using configurable provider rates.
   - Budget thresholds and operational alerts.
   - Guest and account processing limits.

5. Feedback:
   - Translation, pronunciation, upload, and technical reports.
   - Open, investigating, and resolved statuses.

6. Content:
   - Help articles.
   - Announcements.

7. Admin roles and audit log.

Use server-enforced roles and Supabase policies. Ordinary users must not be able to assign themselves administrator privileges.

Use stronger authentication for administrators, including MFA where supported.

Provide a documented secure procedure for creating the first administrator.

Do not show private student transcripts, recordings, or explanations in general admin dashboards.

Production charts must use real recorded events. Clearly label development fixtures and sample data; never present invented usage or costs as live data.

REAL AI PROVIDERS

Integrate actual services for:
- Translation.
- Speech recognition.
- Speech synthesis.
- Level-based explanations.

Before selecting providers:
1. Consult current official documentation.
2. Verify support separately for each language and each task.
3. Pay particular attention to Kinyarwanda.
4. Compare quality, cost, limits, privacy, and integration requirements.
5. Record the decision and evidence in docs/providers.md.

Do not assume a provider supports Kinyarwanda speech because it supports Kinyarwanda text.
Do not assume speech recognition support means speech synthesis support.

Use task-specific provider adapters so services can be changed without rewriting the interface.

Create a capability matrix for:
- English
- French
- Kinyarwanda

Track translation, transcription, synthesis, and explanations separately.

Use one provider per task initially where suitable, with honest unsupported states. Add fallbacks only when configured and verified.

If API credentials are unavailable:
- Implement the real integration code and environment configuration.
- Show an explicit setup/unavailable state.
- Keep any demo mode clearly labelled and separate.
- Never return canned results as if live AI processed the request.

Track request status, latency, usage, and estimated cost without logging private content unnecessarily.

SECURITY AND PRIVACY

Implement:
- Supabase Row Level Security.
- Private storage buckets.
- Server-side authorization.
- Input and file validation.
- Rate limits and budget controls.
- Safe error responses.
- Restricted administrative operations.
- Signed, expiring file access where appropriate.
- Configurable retention and cleanup.
- Account deletion and associated data cleanup.
- Logs that exclude passwords, tokens, provider keys, and unnecessary student content.

Recordings involving other people should have a concise consent reminder.
Include editable Privacy and Terms pages, clearly marked for owner review before public launch.

USER EXPERIENCE

Handle:
- Empty inputs.
- Recording.
- Uploading.
- Processing.
- Success.
- Retryable failures.
- Unsupported languages.
- Invalid or oversized files.
- Microphone denial.
- Network loss.
- Usage limits.
- Expired temporary results.

Preserve user input after errors.
Prevent duplicate requests.
Do not autoplay audio.
Support keyboard navigation, visible focus, labelled controls, and screen-reader status messages.

Optimize for mobile devices and slower connections. Load large features only when needed.

DEPLOYMENT

Prepare:
- Vercel configuration.
- Supabase migrations and policies.
- Environment variable documentation.
- Supabase authentication redirect configuration.
- Custom-domain setup instructions for umvalearn.com.
- SPA deep-link handling.
- Background worker setup if required.
- Production logging and error monitoring setup.
- Backup and recovery guidance.

Do not purchase a domain, incur charges, or deploy publicly without my explicit authorization.

FUTURE MOBILE APP

Do not build the native app in this phase.
Prepare for a future React Native/Expo app through:
- Reusable backend APIs.
- Shared validation and types where practical.
- Consistent account identifiers.
- Cross-device Library access.
- Documented authentication and file-access flows.

DIFFERENTIATING FEATURES

Prioritize:
1. Kinyarwanda quality and useful academic vocabulary.
2. Connected record → review → translate → listen → save workflow.
3. Bilingual original/translation view.
4. Separate level-based explanations.
5. Saved Study Packs.
6. Low-data usability.

After the core application works, add:
- Personal vocabulary notebook.
- Flashcards and revision questions from selected study material.
- PDF text extraction.
- OCR for photographed notes, with extracted text reviewed before AI processing.

Keep later features out of the critical path and do not leave nonworking buttons in production.

IMPLEMENTATION PROCESS

First inspect the workspace and existing instructions. Preserve existing work.

Create a concise implementation checklist, then begin coding.

Build in working stages:
1. Project foundation, design system, welcome screen, navigation.
2. Supabase schema, authentication, access policies.
3. Core tool screens and real provider adapters.
4. Recording, uploads, processing, playback, downloads.
5. Library, History, Study Packs, preferences.
6. Admin dashboard and operational metrics.
7. Accessibility, testing, deployment preparation.

Run meaningful checks for:
- Guest access to core tools.
- Authentication gates for the four restricted actions.
- Resuming an action after sign-in.
- Isolation between users’ data.
- Denial of unauthorized admin access.
- Provider failures and unsupported language states.
- File validation.
- Core recording/transcription/translation/audio workflows.

Run linting, type checking, relevant tests, and a production build.

DELIVERABLES

Provide:
- Working source code.
- Database migrations and security policies.
- .env.example without secrets.
- README with local setup.
- Provider setup and capability documentation.
- Vercel and Supabase deployment instructions.
- Secure administrator setup instructions.
- Test results.
- Clear list of any credential-dependent or unverified functionality.

Start implementing now. Make reasonable implementation decisions within these requirements. Ask only when a missing decision or credential genuinely blocks the next step. Never describe unfinished integrations as fully functioning or nationwide-ready.
