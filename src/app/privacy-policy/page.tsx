export const metadata = {
  title: 'Privacy Policy | TTemplate',
  description: 'Privacy Policy for the TTemplate ESO raid template tool.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#090c11] px-5 py-12 text-slate-200 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d3b475]">TTemplate</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-400">Last updated: October 8, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-300 sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">1. About this policy</h2>
            <p className="mt-3">
              This Privacy Policy explains how TTemplate, an ESO raid template planning application
              operated by Thelinor, handles information when you use the application. TTemplate is
              a static web application hosted on GitHub Pages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Information you provide</h2>
            <p className="mt-3">
              TTemplate lets you create raid templates containing information you enter, such as
              group and player names, roles, character configuration, equipment, skills, and
              encounter settings. This information may identify people if you choose to include
              personal names or other identifying details.
            </p>
            <p className="mt-3">
              The current template is automatically stored in your browser&apos;s local storage so
              that it can be restored when you return to the application in that browser. It stays
              on that device unless you clear the browser&apos;s site data. TTemplate does not
              transmit this local copy to a TTemplate-operated application server.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Google Drive</h2>
            <p className="mt-3">
              If you choose to use Google Drive import or save, Google will ask you to authorize
              access. TTemplate requests the Google Drive <code className="text-[#f0d69c]">drive.file</code>{' '}
              permission. This allows the application to access a file you explicitly select with
              Google Picker and to create files using the application. It does not give TTemplate
              general access to browse or read all files in your Drive.
            </p>
            <p className="mt-3">
              When you import a file, its JSON contents are retrieved from Google Drive into your
              browser and loaded as the current template. You can export a new copy to Drive or
              explicitly save changes to the selected Drive file. In either case, the current
              template JSON is sent from your browser to Google Drive. TTemplate does not operate a
              server that stores these files or the contents of your templates.
            </p>
            <p className="mt-3">
              Google handles sign-in, authorization, and Drive storage under its own terms and
              privacy policy. You can revoke TTemplate&apos;s Google access in your Google Account
              security settings. Removing a file saved to Drive must be done in Google Drive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Information processed by service providers</h2>
            <p className="mt-3">
              The application loads from GitHub Pages and loads the Google Identity Services
              script as part of its pages. If you choose a Drive feature, it also uses Google
              Picker and the Google Drive API. These providers may process technical information,
              such as your IP address, browser details, and requests, to deliver and secure their
              services. Their processing is governed by their own privacy terms. TTemplate does
              not add advertising or analytics services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Retention and your choices</h2>
            <p className="mt-3">
              You control template files you download or save in your Google Drive. You can clear
              the locally saved template by clearing this site&apos;s browser storage. You can also
              stop using Google Drive features or revoke the application&apos;s Google authorization.
              TTemplate does not retain a separate server-side copy of your templates.
            </p>
            <p className="mt-3">
              If your browser supports direct local-file editing, saving changes to an imported
              local JSON file requires your permission and writes the current template to that
              selected file. You can instead export a separate JSON copy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Children</h2>
            <p className="mt-3">
              TTemplate is a general-purpose game planning tool and is not directed to children.
              Please do not include sensitive personal information in a template.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Changes and contact</h2>
            <p className="mt-3">
              This policy may be updated as the application changes. The latest version will be
              published at this URL with a revised update date. For privacy questions, contact the
              project maintainer through the{' '}
              <a
                href="https://github.com/Thelinor-eso/TTemplate"
                className="text-[#f0d69c] underline underline-offset-4 hover:text-white"
              >
                TTemplate GitHub repository
              </a>
              . Please do not post private information in a public issue.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
