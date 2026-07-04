import { Link } from "react-router-dom";
import LegalDocumentLayout from "../components/LegalDocumentLayout";
import { SUPPORT_EMAIL } from "../constants/legal";
import { BRAND_NAME, BRAND_WITH_OWNER } from "../design/stitchAssets";

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="Terms of Use">
      <p>
        These Terms of Use (“Terms”) govern your access to {BRAND_NAME} operated by{" "}
        {BRAND_WITH_OWNER} at <a href="https://www.techmuzzle.in">www.techmuzzle.in</a>. By using
        the service, you agree to these Terms.
      </p>

      <h2>The service</h2>
      <p>
        {BRAND_NAME} provides NEET previous-year question practice, study mode, mock tests,
        analytics, and related learning tools. Features may change, be added, or be removed as we
        improve the product.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You must provide accurate registration information and keep your credentials secure.</li>
        <li>You are responsible for activity under your account.</li>
        <li>Notify us promptly at {SUPPORT_EMAIL} if you suspect unauthorized access.</li>
        <li>We may suspend or terminate accounts that violate these Terms or abuse the platform.</li>
      </ul>

      <h2>Educational content</h2>
      <ul>
        <li>
          Questions, solutions, and explanations are provided for study and practice. They are not
          official NTA publications unless explicitly stated.
        </li>
        <li>
          AI-generated hints or explanations may contain errors. Always verify important concepts
          with textbooks, teachers, or official sources.
        </li>
        <li>
          You may not scrape, bulk-download, or redistribute our content or images for commercial
          use without written permission.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to break, overload, or circumvent security or rate limits.</li>
        <li>Use bots or automation to manipulate leaderboards or harvest data.</li>
        <li>Upload malware, spam, or unlawful material through feedback or other channels.</li>
        <li>Impersonate others or misrepresent your affiliation.</li>
      </ul>

      <h2>Free service</h2>
      <p>
        {BRAND_NAME} is currently offered without payment. We may introduce optional paid features
        in the future; we will update these Terms before charging users.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The service is provided “as is” for educational purposes. We do not guarantee exam ranks,
        scores, or admission outcomes. Use your own judgment when preparing for NEET or any other
        exam.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {BRAND_WITH_OWNER} is not liable for indirect,
        incidental, or consequential damages arising from your use of {BRAND_NAME}. Our total
        liability for any claim related to the service is limited to the amount you paid us in the
        twelve months before the claim (currently zero for the free service).
      </p>

      <h2>Privacy</h2>
      <p>
        Our <Link to="/privacy">Privacy Policy</Link> explains how we handle personal data. It is
        incorporated into these Terms by reference.
      </p>

      <h2>Changes</h2>
      <p>
        We may revise these Terms. Material changes will be reflected by updating the “Last updated”
        date. Continued use after changes constitutes acceptance.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Disputes shall be subject to the courts of
        competent jurisdiction in India, unless otherwise required by applicable law.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about these Terms, email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalDocumentLayout>
  );
}
