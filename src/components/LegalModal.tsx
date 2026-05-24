import { CloseIcon } from './Icons'

const SITE_NAME = 'Dial'
const CONTACT_EMAIL = 'support@dial.golf'
const EFFECTIVE_DATE = 'May 24, 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: 20, fontWeight: 700, color: '#1F1D17',
        letterSpacing: '-0.02em', marginBottom: 10, marginTop: 0,
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#6B6857', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function PrivacyPolicy() {
  return (
    <>
      <p style={{ fontSize: 14, color: '#B5AC95', marginBottom: 24 }}>Effective: {EFFECTIVE_DATE}</p>

      <Section title="What we collect">
        <p>We collect your email address when you create an account, and the shot data you log (club, yardage, timestamp, optional note). We do not collect your name, location, or payment information.</p>
      </Section>

      <Section title="How we use it">
        <p>Your email is used solely to authenticate your account and send you password-reset or confirmation emails. Your shot data is used exclusively to power your personal yardage dashboard — it is never shared with other users or third parties.</p>
      </Section>

      <Section title="Data storage">
        <p>Data is stored securely on Supabase (PostgreSQL, hosted on AWS). Row-level security policies ensure that only you can read or write your own data — not other users, and not us.</p>
      </Section>

      <Section title="Third-party services">
        <p>We use <strong>Supabase</strong> for authentication and database storage. Their privacy policy is available at supabase.com/privacy. We do not use analytics, advertising networks, or tracking pixels.</p>
      </Section>

      <Section title="Data deletion">
        <p>You can delete your account and all associated data at any time by emailing <strong>{CONTACT_EMAIL}</strong>. We will process the request within 30 days.</p>
      </Section>

      <Section title="Cookies">
        <p>{SITE_NAME} uses a single session cookie to keep you signed in. No advertising or tracking cookies are used.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about your data? Email us at <strong>{CONTACT_EMAIL}</strong>.</p>
      </Section>
    </>
  )
}

function TermsOfService() {
  return (
    <>
      <p style={{ fontSize: 14, color: '#B5AC95', marginBottom: 24 }}>Effective: {EFFECTIVE_DATE}</p>

      <Section title="Acceptance">
        <p>By creating an account on {SITE_NAME}, you agree to these Terms. If you do not agree, do not use the service.</p>
      </Section>

      <Section title="The service">
        <p>{SITE_NAME} is a personal golf yardage logging tool. You can record shot distances per club and view your averages over time. The service is provided as-is.</p>
      </Section>

      <Section title="Your account">
        <p>You are responsible for maintaining the security of your password. You must provide a valid email address to create an account. You may not create accounts on behalf of others without their consent.</p>
      </Section>

      <Section title="Your data">
        <p>You own all shot data you log. We do not claim any rights over it. You can export or delete it at any time by contacting us at <strong>{CONTACT_EMAIL}</strong>.</p>
      </Section>

      <Section title="Acceptable use">
        <p>You may not use {SITE_NAME} to attempt to gain unauthorized access to our systems, interfere with service availability, or scrape data from other users. Violations may result in account termination.</p>
      </Section>

      <Section title="Disclaimer of warranties">
        <p>{SITE_NAME} is provided "as is" without warranties of any kind. We do not guarantee the accuracy of calculated averages or uninterrupted service availability.</p>
      </Section>

      <Section title="Limitation of liability">
        <p>To the maximum extent permitted by law, {SITE_NAME} shall not be liable for indirect, incidental, or consequential damages arising from use of the service.</p>
      </Section>

      <Section title="Changes">
        <p>We may update these Terms. If changes are material, we will notify you by email. Continued use after notification constitutes acceptance.</p>
      </Section>

      <Section title="Contact">
        <p>Questions? Email <strong>{CONTACT_EMAIL}</strong>.</p>
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
