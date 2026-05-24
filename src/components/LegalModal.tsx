import { CloseIcon } from './Icons'

const SITE_NAME = 'Dial Golf'
const COMPANY_NAME = 'Dial Golf'
const CONTACT_EMAIL = 'support@dialgolf.xyz'
const EFFECTIVE_DATE = 'May 24, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 18, fontWeight: 700, color: '#1F1D17',
        letterSpacing: '-0.02em', marginBottom: 10, marginTop: 0,
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#6B6857', lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

function PrivacyPolicy() {
  return (
    <>
      <p style={{ fontSize: 13, color: '#B5AC95', marginBottom: 24 }}>Effective date: {EFFECTIVE_DATE}</p>

      <p style={{ fontSize: 14, color: '#6B6857', lineHeight: 1.75, marginBottom: 24 }}>
        This Privacy Policy explains how {COMPANY_NAME} ("we," "us," or "our") collects, uses, and protects your personal information when you use the {SITE_NAME} web application (the "Service"). By using the Service, you agree to the practices described in this policy.
      </p>

      <Section title="1. Information We Collect">
        <p><strong style={{ color: '#1F1D17' }}>Account information:</strong> When you create an account, we collect your first name, last name, and email address. These are used solely to authenticate your account and personalise your experience.</p>
        <p style={{ marginTop: 10 }}><strong style={{ color: '#1F1D17' }}>Usage data you provide:</strong> We collect the golf shot data you voluntarily log — including club selection, yardage, timestamps, and optional notes. We also store any profile settings you configure, such as your home course, handicap index, and equipment details.</p>
        <p style={{ marginTop: 10 }}><strong style={{ color: '#1F1D17' }}>Technical data:</strong> We may collect standard server logs including your IP address, browser type, and the pages you visit within the Service. This data is used for security monitoring and is not sold or shared with third parties.</p>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Provide, maintain, and improve the Service</li>
          <li style={{ marginBottom: 6 }}>Authenticate your account and send transactional emails (e.g. email verification, password resets)</li>
          <li style={{ marginBottom: 6 }}>Display your shot history, club averages, and personalised recommendations</li>
          <li style={{ marginBottom: 6 }}>Respond to support requests you submit to us</li>
        </ul>
        <p style={{ marginTop: 8 }}>We do not use your data for advertising, and we do not sell your data to any third party.</p>
      </Section>

      <Section title="3. Data Storage and Security">
        <p>Your data is stored securely using <strong style={{ color: '#1F1D17' }}>Supabase</strong>, a managed cloud database platform hosted on Amazon Web Services (AWS) infrastructure. All data is transmitted over encrypted HTTPS connections.</p>
        <p style={{ marginTop: 10 }}>Row-Level Security (RLS) policies are enforced at the database level, meaning your data is accessible only to your own account — not to other users, and not to {COMPANY_NAME} staff in the course of normal operations.</p>
        <p style={{ marginTop: 10 }}>While we take reasonable technical and organisational measures to protect your data, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.</p>
      </Section>

      <Section title="4. Data Retention">
        <p>We retain your account and shot data for as long as your account remains active. If you delete your account, we will permanently delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.</p>
      </Section>

      <Section title="5. Third-Party Services">
        <p>The Service integrates with the following third-party provider:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}><strong style={{ color: '#1F1D17' }}>Supabase</strong> — authentication and database storage. Their privacy policy is available at supabase.com/privacy.</li>
        </ul>
        <p style={{ marginTop: 8 }}>We do not integrate advertising networks, analytics platforms (such as Google Analytics), or social media tracking pixels.</p>
      </Section>

      <Section title="6. Cookies and Local Storage">
        <p>{SITE_NAME} uses a single session cookie issued by Supabase to keep you signed in. We also use your browser's localStorage to remember your last-viewed tab across sessions. No advertising or cross-site tracking cookies are used.</p>
      </Section>

      <Section title="7. Your Rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Access the personal data we hold about you</li>
          <li style={{ marginBottom: 6 }}>Request correction of inaccurate data</li>
          <li style={{ marginBottom: 6 }}>Request deletion of your account and all associated data</li>
          <li style={{ marginBottom: 6 }}>Object to or restrict certain processing of your data</li>
        </ul>
        <p style={{ marginTop: 8 }}>To exercise any of these rights, please contact us at <strong style={{ color: '#1F1D17' }}>{CONTACT_EMAIL}</strong>. We will respond within 30 days.</p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from anyone under 18. If we become aware that we have collected data from a minor, we will delete it promptly.</p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or by displaying a prominent notice within the Service. The "Effective date" at the top of this page indicates when the policy was last revised. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.</p>
      </Section>

      <Section title="10. Contact">
        <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us at <strong style={{ color: '#1F1D17' }}>{CONTACT_EMAIL}</strong>.</p>
      </Section>
    </>
  )
}

function TermsOfService() {
  return (
    <>
      <p style={{ fontSize: 13, color: '#B5AC95', marginBottom: 24 }}>Effective date: {EFFECTIVE_DATE}</p>

      <p style={{ fontSize: 14, color: '#6B6857', lineHeight: 1.75, marginBottom: 24 }}>
        These Terms of Service ("Terms") govern your access to and use of the {SITE_NAME} web application (the "Service") provided by {COMPANY_NAME} ("we," "us," or "our"). Please read these Terms carefully before using the Service. By creating an account or using the Service, you agree to be bound by these Terms.
      </p>

      <Section title="1. Eligibility">
        <p>You must be at least 18 years of age to use the Service. By creating an account, you represent and warrant that you meet this age requirement. If you are accessing the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.</p>
      </Section>

      <Section title="2. Account Registration">
        <p>To use the Service, you must create an account by providing a valid email address and a secure password. You are responsible for:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Maintaining the confidentiality of your account credentials</li>
          <li style={{ marginBottom: 6 }}>All activity that occurs under your account</li>
          <li style={{ marginBottom: 6 }}>Notifying us immediately at {CONTACT_EMAIL} if you suspect unauthorised access to your account</li>
        </ul>
        <p style={{ marginTop: 8 }}>You may not create accounts on behalf of others without their explicit consent, and you may not share your login credentials with any third party.</p>
      </Section>

      <Section title="3. Description of the Service">
        <p>{SITE_NAME} is a personal golf performance tracking application. The Service allows you to log shot distances by club, view your historical averages, receive club recommendations based on wind and target distance, record scorecard data, and track practice sessions.</p>
        <p style={{ marginTop: 10 }}>The Service is intended for personal, non-commercial use. Club recommendations and distance calculations are estimates based on your own logged data and are provided for informational purposes only. They do not constitute professional golf instruction.</p>
      </Section>

      <Section title="4. Your Data and Content">
        <p>You retain full ownership of all data and content you submit to the Service ("User Data"). By submitting User Data, you grant {COMPANY_NAME} a limited, non-exclusive licence to store and process that data solely for the purpose of providing the Service to you.</p>
        <p style={{ marginTop: 10 }}>We do not claim any intellectual property rights over your User Data, and we will not share it with other users or third parties except as described in our Privacy Policy.</p>
        <p style={{ marginTop: 10 }}>You may request a copy of your data or deletion of your account at any time by contacting us at <strong style={{ color: '#1F1D17' }}>{CONTACT_EMAIL}</strong>.</p>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree not to use the Service to:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Violate any applicable law or regulation</li>
          <li style={{ marginBottom: 6 }}>Attempt to gain unauthorised access to our systems, databases, or the accounts of other users</li>
          <li style={{ marginBottom: 6 }}>Interfere with or disrupt the availability or integrity of the Service</li>
          <li style={{ marginBottom: 6 }}>Introduce malware, viruses, or other harmful code</li>
          <li style={{ marginBottom: 6 }}>Scrape, crawl, or harvest data from the Service by automated means</li>
          <li style={{ marginBottom: 6 }}>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
        </ul>
        <p style={{ marginTop: 8 }}>Violation of these rules may result in immediate suspension or permanent termination of your account.</p>
      </Section>

      <Section title="6. Intellectual Property">
        <p>The {SITE_NAME} name, logo, design, and all software comprising the Service are the intellectual property of {COMPANY_NAME} and are protected by applicable copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right to use our trademarks or branding without our prior written consent.</p>
      </Section>

      <Section title="7. Disclaimer of Warranties">
        <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, {COMPANY_NAME.toUpperCase()} DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
        <p style={{ marginTop: 10 }}>We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. Club recommendations are estimates only and we make no guarantee as to their accuracy or fitness for any particular golf situation.</p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY_NAME.toUpperCase()} AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF, OR INABILITY TO USE, THE SERVICE — INCLUDING LOSS OF DATA, PROFITS, OR GOODWILL — EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
        <p style={{ marginTop: 10 }}>Our total liability to you for any claim arising out of or related to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim (or USD $10 if no payments were made).</p>
      </Section>

      <Section title="9. Indemnification">
        <p>You agree to indemnify, defend, and hold harmless {COMPANY_NAME} and its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from your use of the Service, your User Data, or your violation of these Terms.</p>
      </Section>

      <Section title="10. Termination">
        <p>We reserve the right to suspend or terminate your account at our sole discretion, with or without notice, if we believe you have violated these Terms or if we discontinue the Service. You may terminate your account at any time by contacting us at {CONTACT_EMAIL}. Upon termination, your right to use the Service ceases immediately.</p>
      </Section>

      <Section title="11. Changes to These Terms">
        <p>We may revise these Terms from time to time. If we make material changes, we will notify you via email or a prominent notice within the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date of revised Terms constitutes your acceptance of the changes.</p>
      </Section>

      <Section title="12. Governing Law">
        <p>These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in the applicable jurisdiction. If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</p>
      </Section>

      <Section title="13. Contact">
        <p>If you have any questions about these Terms, please contact us at <strong style={{ color: '#1F1D17' }}>{CONTACT_EMAIL}</strong>.</p>
      </Section>
    </>
  )
}

interface Props {
  doc: 'privacy' | 'terms'
  onClose: () => void
}

export default function LegalModal({ doc, onClose }: Props) {
  const title = doc === 'privacy' ? 'Privacy Policy' : 'Terms of Service'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(31,29,23,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640,
          background: '#FAF6EA', borderRadius: 28,
          border: '1px solid #E0D8C5',
          boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex', flexDirection: 'column',
          animation: 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '28px 32px 20px', borderBottom: '1px solid #E0D8C5', flexShrink: 0,
        }}>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 28, fontWeight: 700, color: '#1F1D17',
            letterSpacing: '-0.03em', margin: 0,
          }}>
            {title}
          </h1>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 18,
              background: '#F0EBDD', border: '1px solid #E0D8C5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E8DFC8' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F0EBDD' }}
          >
            <CloseIcon size={16} color="#1F1D17" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '24px 32px 32px', overflowY: 'auto' }}>
          {doc === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        </div>
      </div>
    </div>
  )
}
