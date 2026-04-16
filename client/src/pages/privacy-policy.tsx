import GlobalHeader from "@/components/GlobalHeader";

export default function PrivacyPolicyPage() {
  return (
    <>
      <GlobalHeader />
      <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">
            Privacy Policy - Job Apply Browser Extension
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Effective date: <strong className="font-semibold">April 16, 2026</strong>
          </p>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">1) Overview</h2>
            <p className="text-sm leading-6 text-slate-800">
              The <strong>Job Apply</strong> browser extension helps you search for
              jobs on supported job boards and assist with completing job
              application forms. It may store some information locally in your
              browser, fetch your profile from the service backend, and send
              job/profile context to an AI provider to generate form content.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">2) Data we collect and store</h2>
            <p className="text-sm leading-6 text-slate-800">
              Depending on your usage, the extension may handle the following
              categories of data:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
              <li>
                <strong>Profile information</strong> (e.g., name, email, phone,
                location and work authorization fields) used to generate
                application answers.
              </li>
              <li>
                <strong>Resume/profile text fields</strong> that you provide or
                that are returned by your profile backend.
              </li>
              <li>
                <strong>Diversity/authorization fields</strong> if present in
                your profile (e.g., work authorization, and other optional fields
                provided by you).
              </li>
              <li>
                <strong>Job and workflow context</strong> such as job description
                snippets, form field labels/options, and application flow state
                to complete the process.
              </li>
              <li>
                <strong>Local extension state</strong> stored in your browser for
                workflow control (for example: processed/applied job identifiers,
                cooldown/session counters, and learned manual input for reuse).
              </li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">3) Where data is stored</h2>
            <p className="text-sm leading-6 text-slate-800">
              The extension stores data locally using Chrome extension storage
              (for example, <code className="rounded bg-slate-100 px-1.5 py-0.5">chrome.storage.local</code>
              ), including (when available) your{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">userProfile</code>{" "}
              and workflow state.
            </p>
            <p className="text-sm text-slate-500">
              You can clear stored data by clearing extension data in your
              browser settings or by uninstalling the extension.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">4) Data sent to third parties</h2>
            <h3 className="text-sm font-semibold text-slate-900">
              4.1 Profile fetch from the backend
            </h3>
            <p className="text-sm leading-6 text-slate-800">
              When the extension needs your profile, it may fetch profile data
              from{" "}
              <a
                className="text-blue-600 underline underline-offset-2"
                href="https://layoffproof.ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://layoffproof.ai
              </a>
              .
            </p>

            <h3 className="mt-3 text-sm font-semibold text-slate-900">
              4.2 AI processing (OpenAI API)
            </h3>
            <p className="text-sm leading-6 text-slate-800">
              The extension sends AI-related requests to the OpenAI API to help
              with tasks such as job matching and generating form field values.
              Requests may include job description context and relevant profile
              fields.
            </p>
            <p className="text-sm text-slate-500">
              You can reduce AI usage by not using the extension’s apply/fill
              features.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">5) How we use data</h2>
            <p className="text-sm leading-6 text-slate-800">
              We use the above information to:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
              <li>assist with job search navigation on supported sites,</li>
              <li>help fill application forms using your profile and job context,</li>
              <li>manage workflow state (pause/resume/limits/cooldowns), and</li>
              <li>
                improve the extension’s ability to map your profile to common
                form fields (e.g., learned manual inputs).
              </li>
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">6) User choices and deletion</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
              <li>
                <strong>Uninstall</strong> the extension to remove locally stored
                data.
              </li>
              <li>
                Use browser settings to clear the extension’s stored data if
                needed.
              </li>
            </ul>
            <p className="text-sm leading-6 text-slate-800">
              If you want to request deletion or have privacy questions, contact
              us at <strong>shahab@techisthenewblack.com</strong>.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">7) Security</h2>
            <p className="text-sm leading-6 text-slate-800">
              We take reasonable technical and organizational measures intended
              to protect data against unauthorized access. However, no method of
              transmission or storage is 100% secure.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">8) Children’s privacy</h2>
            <p className="text-sm leading-6 text-slate-800">
              The extension is not intended for children under 13 (or the
              relevant age in your jurisdiction).
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">9) Changes to this policy</h2>
            <p className="text-sm leading-6 text-slate-800">
              We may update this policy from time to time. The effective date
              above will reflect the most recent version.
            </p>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">10) Contact</h2>
            <p className="text-sm leading-6 text-slate-800">
              Email: <strong>shahab@techisthenewblack.com</strong>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

