import { useState, useMemo } from 'react';
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi2';
import {
  HiChevronRight,
  HiOutlineChatAlt2,
  HiArrowRight,
} from 'react-icons/hi';
import { Card, Button, SearchBar } from '@/components/ui';
import { useBranding } from '@/context/BrandingContext';

const BUILTIN_FAQ = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How do I create an account?',
        a: "Click \"Register\" in the header. Enter your name, email, and a password (at least 8 characters). We'll send a verification code to your email — enter it to activate your account.",
      },
      {
        q: 'Is the platform really free?',
        a: 'Yes. All past papers, notes and AI tutor interactions are free. You only need an account to save bookmarks, track progress and join live sessions.',
      },
      {
        q: 'Do I need to verify my email?',
        a: 'Verification is optional for most features, but recommended. Some actions may require a verified email address. Verify at any time from the profile page.',
      },
    ],
  },
  {
    category: 'Content',
    items: [
      {
        q: 'Where do past papers come from?',
        a: 'Papers are curated by our team from official exam sources and contributed by teachers. All papers are verified before publishing.',
      },
      {
        q: "Can I request a paper that's missing?",
        a: 'Yes. Contact us through the Help page. We add papers regularly based on student requests — usually within a week.',
      },
      {
        q: 'How often are notes updated?',
        a: 'Notes are updated continuously based on syllabus changes and student feedback. Each note shows its last updated date.',
      },
    ],
  },
  {
    category: 'AI Tutor',
    items: [
      {
        q: 'What can the AI tutor help with?',
        a: "Explanations of concepts, step-by-step problem solving, practice questions, and revision. It's scoped to TVET topics — it won't answer unrelated questions.",
      },
      {
        q: 'Are AI answers always correct?',
        a: 'AI is helpful but not infallible. Always cross-check critical facts with your textbooks or teacher. Use AI as a study aid, not a replacement for learning.',
      },
      {
        q: 'Can I save my AI conversations?',
        a: 'Yes. All conversations are saved to your account. Access them from the AI tutor page — click any past session to review or continue.',
      },
    ],
  },
  {
    category: 'Account & Data',
    items: [
      {
        q: 'How do I reset my password?',
        a: "Click \"Forgot password\" on the login page. We'll email you a reset code. Enter it along with your new password to reset the account.",
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Contact support to request account deletion. All your data (bookmarks, attempts, progress) will be permanently removed.',
      },
      {
        q: 'How is my data used?',
        a: "We use your data only to provide the platform. We don't sell or share data with third parties. See our Privacy Policy for details.",
      },
    ],
  },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-primary)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <span className="text-sm font-medium text-[var(--text-primary)] pr-2">
          {item.q}
        </span>
        <HiChevronRight
          className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-color)] pt-4">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const { branding } = useBranding();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [openId, setOpenId] = useState(null);

  const allFaq = useMemo(() => {
    const brandingFaq = Array.isArray(branding?.faq) ? branding.faq : [];
    if (brandingFaq.length === 0) return BUILTIN_FAQ;

    return [
      {
        category: 'From the team',
        items: brandingFaq,
      },
      ...BUILTIN_FAQ,
    ];
  }, [branding]);

  const categories = ['All', ...allFaq.map((g) => g.category)];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allFaq
      .filter((g) => activeCategory === 'All' || g.category === activeCategory)
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter(
              (i) =>
                i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)
            )
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [allFaq, activeCategory, search]);

  const totalShown = filtered.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bg-tertiary)] mb-4">
          <HiOutlineQuestionMarkCircle className="w-7 h-7 text-[var(--brand-primary)]" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Frequently asked questions</h1>
        <p className="text-base text-[var(--text-secondary)] mt-3 max-w-xl mx-auto">
          Everything you need to know about {branding?.appName || 'TVETGrid'}.
        </p>
        <div className="mt-6 max-w-md mx-auto">
          <SearchBar value={search} onChange={setSearch} placeholder="Search questions..." />
        </div>
      </section>

      {/* Category chips */}
      {categories.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setActiveCategory(c);
                setOpenId(null);
              }}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === c
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* FAQ groups */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No questions match your search.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {filtered.map((group, gi) => (
            <section key={group.category}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-3 px-1">
                {group.category}
              </h2>
              <div className="space-y-2">
                {group.items.map((item, i) => {
                  const id = `${gi}-${i}`;
                  return (
                    <FaqItem
                      key={id}
                      item={item}
                      isOpen={openId === id}
                      onToggle={() => setOpenId(openId === id ? null : id)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Still stuck */}
      {totalShown > 0 && (
        <section className="rounded-2xl bg-[var(--bg-tertiary)] p-8 text-center">
          <HiOutlineChatAlt2 className="w-8 h-8 mx-auto text-[var(--brand-primary)] mb-3" />
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Didn't find your answer?
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5">
            Our support team can help with anything else.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button to="/help" iconRight={<HiArrowRight className="w-4 h-4" />}>
              Visit help center
            </Button>
            {branding?.supportEmail && (
              <Button href={`mailto:${branding.supportEmail}`} variant="outline">
                Contact support
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}