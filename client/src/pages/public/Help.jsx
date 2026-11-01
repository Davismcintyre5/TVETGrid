import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineEnvelope, HiOutlinePhone } from 'react-icons/hi2';
import {
  HiOutlineChatAlt2,
  HiSearch,
  HiChevronRight,
} from 'react-icons/hi';
import { Card, SearchBar } from '@/components/ui';
import { useBranding } from '@/context/BrandingContext';
import { useLegalModal } from '@/components/public/LegalModal';

const HELP_TOPICS = [
  {
    icon: HiSearch,
    title: 'Getting Started',
    description: 'Create an account, verify your email, and start browsing.',
    link: '/register',
    linkLabel: 'Create account',
  },
  {
    icon: HiSearch,
    title: 'Finding Content',
    description: 'How to search for courses, past papers and study notes.',
    link: '/courses',
    linkLabel: 'Browse content',
  },
  {
    icon: HiOutlineChatAlt2,
    title: 'AI Tutor',
    description: 'Using the AI tutor for explanations, practice and revision.',
    link: '/register',
    linkLabel: 'Try AI tutor',
  },
  {
    icon: HiOutlineEnvelope,
    title: 'Account & Billing',
    description: 'Manage your profile, password and preferences.',
    link: '/login',
    linkLabel: 'Login',
  },
];

const FAQ_QUICK = [
  {
    q: 'Is the platform free?',
    a: "Yes. Browsing courses, papers, notes, and using the AI tutor are free. You only need to create an account to save bookmarks and track progress.",
  },
  {
    q: 'How do I download past papers?',
    a: 'Open any paper from the Papers page. A preview opens with a Download button. Save it to your device for offline study.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: "Click \"Forgot password\" on the login page. We'll email you a reset code. Enter it along with a new password to reset your account.",
  },
  {
    q: 'How do live sessions work?',
    a: "Teachers schedule meetings from the dashboard. You'll receive an invite by email. Click the link in the invite or join from the Meetings page when the session goes live.",
  },
  {
    q: 'Can I use the platform on my phone?',
    a: 'Yes. The site is fully responsive and works on any modern mobile browser. No app installation required.',
  },
  {
    q: 'What if a paper or note is missing?',
    a: 'Contact us using the support information below. We add new papers and notes regularly based on student requests.',
  },
];

export default function Help() {
  const { branding } = useBranding();
  const { open: openLegal } = useLegalModal();
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const filteredFaq = search
    ? FAQ_QUICK.filter(
        (f) =>
          f.q.toLowerCase().includes(search.toLowerCase()) ||
          f.a.toLowerCase().includes(search.toLowerCase())
      )
    : FAQ_QUICK;

  const contacts = [
    {
      icon: HiOutlineEnvelope,
      label: 'Email',
      value: branding?.supportEmail,
      action: (v) => `mailto:${v}`,
      hint: 'Response within 24 hours',
    },
    {
      icon: HiOutlinePhone,
      label: 'Phone',
      value: branding?.supportPhone,
      action: (v) => `tel:${v}`,
      hint: 'Mon-Fri, 9am-5pm',
    },
  ].filter((c) => c.value);

  return (
    <div className="space-y-16 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">How can we help?</h1>
        <p className="text-base text-[var(--text-secondary)] mt-3">
          Find answers, get support, or reach out to our team.
        </p>
        <div className="mt-6 max-w-md mx-auto">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search help topics..."
          />
        </div>
      </section>

      {/* Quick topics */}
      {!search && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Popular topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {HELP_TOPICS.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.title}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                        {t.title}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mb-3">
                        {t.description}
                      </p>
                      <Link
                        to={t.link}
                        className="text-sm font-medium text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                      >
                        {t.linkLabel}
                        <HiChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          {search ? `Results (${filteredFaq.length})` : 'Frequently asked'}
        </h2>
        {filteredFaq.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              No matching questions. Try a different search or contact support below.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFaq.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <Card key={i} padding={false}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {f.q}
                    </span>
                    <HiChevronRight
                      className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-color)] pt-4">
                      {f.a}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Contact */}
      {!search && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Still need help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.length > 0 ? (
              contacts.map((c) => {
                const Icon = c.icon;
                return (
                  <Card key={c.label}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                          {c.label}
                        </h3>
                        <a
                          href={c.action(c.value)}
                          className="text-sm text-[var(--brand-primary)] hover:underline break-all"
                        >
                          {c.value}
                        </a>
                        {c.hint && (
                          <p className="text-xs text-[var(--text-muted)] mt-1">{c.hint}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="md:col-span-2">
                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                  Contact information not configured yet.
                </p>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Legal links */}
      <section className="text-center text-sm">
        <p className="text-[var(--text-muted)]">
          Legal documents:{' '}
          <button
            type="button"
            onClick={() => openLegal('terms')}
            className="text-[var(--brand-primary)] hover:underline"
          >
            Terms
          </button>
          {' · '}
          <button
            type="button"
            onClick={() => openLegal('privacy')}
            className="text-[var(--brand-primary)] hover:underline"
          >
            Privacy
          </button>
          {' · '}
          <button
            type="button"
            onClick={() => openLegal('cookies')}
            className="text-[var(--brand-primary)] hover:underline"
          >
            Cookies
          </button>
        </p>
      </section>
    </div>
  );
}