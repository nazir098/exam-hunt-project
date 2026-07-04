import LegalDocumentLayout from "../components/LegalDocumentLayout";
import { SUPPORT_EMAIL } from "../constants/legal";
import { BRAND_NAME, BRAND_WITH_OWNER } from "../design/stitchAssets";

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout title="Privacy Policy">
      <p>
        {BRAND_WITH_OWNER} (“we”, “us”) operates {BRAND_NAME} at{" "}
        <a href="https://www.techmuzzle.in">www.techmuzzle.in</a>. This policy explains what
        information we collect when you use the service and how we use it.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> — email address, display name, and password hash when you
          register. If you use Google sign-in, we receive basic profile information provided by
          Google (such as your name and email).
        </li>
        <li>
          <strong>Learning activity</strong> — practice and test sessions, answers submitted,
          scores, bookmarks, revision queue, leaderboard participation, and related progress stored
          in your account.
        </li>
        <li>
          <strong>Feedback</strong> — optional reports you send about questions or the product.
        </li>
        <li>
          <strong>Technical data</strong> — browser type, device information, and approximate usage
          collected through privacy-friendly analytics (for example Cloudflare Web Analytics and/or
          Google Analytics) to understand traffic and improve the product.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Provide and personalize study, practice, test, and analytics features.</li>
        <li>Maintain your session, streaks, and saved progress across devices.</li>
        <li>Operate leaderboards and aggregate performance statistics.</li>
        <li>Improve reliability, fix bugs, and understand which features are used.</li>
        <li>Respond to support requests and feedback.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell your personal information.</li>
        <li>We do not display third-party advertising based on your activity on {BRAND_NAME}.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We use trusted providers to run the service, such as:</p>
      <ul>
        <li>Cloud hosting and content delivery (for example Cloudflare).</li>
        <li>Database hosting (MongoDB Atlas).</li>
        <li>Object storage for question images (Cloudflare R2 or similar CDN).</li>
        <li>Google Sign-In, when you choose that login method.</li>
        <li>Optional AI features, which may send question context to an external model provider to
          generate hints or explanations.</li>
      </ul>
      <p>
        These providers process data only as needed to deliver the service and under their own
        privacy terms.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We use cookies and browser storage for authentication, session preferences, and analytics.
        You can limit cookies in your browser settings; some features may not work without them.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep account and practice data while your account is active. You may request deletion of
        your account by contacting us. We may retain minimal logs or backups for a limited period
        for security and legal compliance.
      </p>

      <h2>Children and students</h2>
      <p>
        {BRAND_NAME} is built for exam preparation. If you are under 18, use the service with a
        parent or guardian’s knowledge. Parents may contact us about a minor’s account.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard measures such as HTTPS, access controls, and hashed passwords.
        No online service can guarantee absolute security.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The “Last updated” date at the top will
        change when we do. Continued use after changes means you accept the revised policy.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions or data requests, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalDocumentLayout>
  );
}
