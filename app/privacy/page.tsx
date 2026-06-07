import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-peach-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-terracotta-600 text-sm mb-6 inline-block hover:underline">
          ← Back to SkinScan
        </Link>

        <h1 className="font-display text-4xl text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: June 2026</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. What We Do</h2>
            <p>
              SkinScan is a <strong>cosmetic skin analysis tool</strong>. It uses AI to analyse
              a selfie you provide and generates a personalised cosmetic report including skin type,
              texture observations, and suggested skincare ingredients. <strong>SkinScan is NOT a
              medical device and does NOT provide medical advice, diagnosis, or treatment.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Email address</strong> — to identify your account and deliver your analysis report.</li>
              <li><strong>Selfie photo</strong> — processed by our AI model to generate your cosmetic analysis.</li>
              <li><strong>Analysis results</strong> — the text-based report generated from your selfie.</li>
              <li><strong>Consent preferences</strong> — your choices regarding analysis consent and photo storage, including timestamps.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. How We Use Your Photo</h2>
            <p>
              By default, your selfie is <strong>processed in memory only</strong> and is
              <strong> permanently deleted immediately after your analysis is complete</strong>.
              It is not stored on our servers unless you explicitly opt in.
            </p>
            <p>
              If you choose to <strong>opt in to photo storage</strong>, your photo is securely
              stored in encrypted cloud storage (AWS S3) so you can track your skin&apos;s progress
              over time. Stored photos are retained for a maximum of <strong>365 days</strong> and
              can be deleted at any time by you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. Third-Party Services</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Google Gemini AI</strong> — processes your selfie to generate the analysis. Google&apos;s data processing policies apply to the image during processing.</li>
              <li><strong>Neon (PostgreSQL)</strong> — stores your account data and analysis results.</li>
              <li><strong>AWS S3</strong> — stores photos only if you opt in to progress tracking.</li>
              <li><strong>Resend</strong> — delivers your report email.</li>
              <li><strong>Cloudflare Turnstile</strong> — CAPTCHA verification to prevent automated abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. Your Rights (DPDP Act 2023)</h2>
            <p>Under the Digital Personal Data Protection Act, 2023 (India), you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Access</strong> — view all data we hold about you.</li>
              <li><strong>Correction</strong> — request corrections to your personal data.</li>
              <li><strong>Erasure</strong> — permanently delete your account, all analysis results, and any stored photos. This can be done directly within the app or by contacting us.</li>
              <li><strong>Withdraw consent</strong> — you may withdraw your consent at any time. Withdrawal does not affect the lawfulness of processing done before withdrawal.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Non-opted-in photos: <strong>Deleted immediately</strong> after analysis.</li>
              <li>Opted-in photos: Retained for up to <strong>365 days</strong>, then automatically deleted.</li>
              <li>Analysis results and account data: Retained until you request deletion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">7. Security</h2>
            <p>
              We use industry-standard encryption (TLS/HTTPS) for all data in transit, encrypted
              cloud storage for data at rest, and access controls to limit who can access your data.
              However, no system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">8. Contact Us</h2>
            <p>
              For any questions about your data, deletion requests, or privacy concerns, contact us at:
            </p>
            <p className="font-medium">privacy@skinscan.in</p>
          </section>
        </div>
      </div>
    </div>
  );
}
