export const metadata = {
  title: 'Terms of Service | TTemplate',
  description: 'Terms of Service for the TTemplate ESO raid template tool.',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#090c11] px-5 py-12 text-slate-200 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d3b475]">TTemplate</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-400">Last updated: October 7, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-300 sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Agreement and the service</h2>
            <p className="mt-3">
              These Terms of Service apply when you use TTemplate, an ESO raid template planning
              application operated by Thelinor. By using the application, you agree to these terms.
              If you do not agree, do not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Your templates and accounts</h2>
            <p className="mt-3">
              You are responsible for the information you enter into templates, the files you
              import, and the files you choose to download or save to Google Drive. You are
              responsible for keeping copies of templates you need. TTemplate does not provide
              server-side backup or recovery for your work.
            </p>
            <p className="mt-3">
              If you use Google Drive features, you must have the right to access the Google
              Account and files involved and must comply with Google&apos;s terms. Google account
              access and Drive storage are provided by Google, not by TTemplate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. Acceptable use</h2>
            <p className="mt-3">
              Use TTemplate only in compliance with applicable laws and the terms of services you
              connect to it. Do not use the application to violate another person&apos;s rights,
              interfere with its operation, attempt unauthorized access, or upload malicious
              content. Do not submit sensitive personal information that is not needed for raid
              planning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. Third-party services and content</h2>
            <p className="mt-3">
              TTemplate relies on third-party services, including GitHub Pages for hosting and
              Google services for optional Drive features. Those services may be unavailable or
              change independently of TTemplate. Their own terms and policies apply to your use of
              them.
            </p>
            <p className="mt-3">
              The Elder Scrolls Online, its game data, and related marks belong to their respective
              owners. TTemplate is an independent community tool and is not affiliated with,
              endorsed by, or sponsored by ZeniMax Media or Bethesda Softworks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Availability and disclaimers</h2>
            <p className="mt-3">
              TTemplate is provided free of charge and on an “as is” and “as available” basis.
              To the extent permitted by applicable law, the maintainer disclaims warranties of
              any kind, whether express or implied, including fitness for a particular purpose,
              availability, accuracy, and non-infringement. Game data and recommendations may be
              incomplete, outdated, or incorrect. Verify important information independently.
            </p>
            <p className="mt-3">
              The maintainer does not guarantee uninterrupted access, preservation of data, or
              compatibility with future browser, Google, hosting, or game changes. The application
              may be modified, suspended, or discontinued at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">6. Limitation of liability</h2>
            <p className="mt-3">
              To the extent permitted by applicable law, the maintainer will not be liable for
              indirect, incidental, special, consequential, or exemplary damages, or for loss of
              data, profits, or goodwill arising from or related to your use of TTemplate. Nothing
              in these terms excludes liability that cannot legally be excluded.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Changes and contact</h2>
            <p className="mt-3">
              These terms may be updated as the application changes. The latest version will be
              published at this URL with a revised update date. Continued use after an update
              means you accept the revised terms. For questions, contact the maintainer through
              the{' '}
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
