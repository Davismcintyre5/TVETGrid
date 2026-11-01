import {
  HiAcademicCap,
  HiSparkles,
  HiUsers,
  HiDocumentText,
  HiBookOpen,
  HiVideoCamera,
  HiArrowRight,
  HiCheckCircle,
} from 'react-icons/hi';
import { Card, Button, Badge } from '@/components/ui';
import { useBranding } from '@/context/BrandingContext';

const FEATURES = [
  {
    icon: HiDocumentText,
    title: 'Past Papers',
    description: 'Download official past papers from your course. Practice with real exam material.',
  },
  {
    icon: HiBookOpen,
    title: 'Study Notes',
    description: 'Curated notes, cheat sheets and references written for TVET students.',
  },
  {
    icon: HiSparkles,
    title: 'AI Tutor',
    description: 'Ask any question, get step-by-step explanations. Available 24 hours a day.',
  },
  {
    icon: HiVideoCamera,
    title: 'Live Sessions',
    description: 'Join live lessons hosted by teachers. Chat, ask questions, watch recordings.',
  },
  {
    icon: HiAcademicCap,
    title: 'Progress Tracking',
    description: 'See mastery across topics. Focus revision on your weakest areas.',
  },
  {
    icon: HiUsers,
    title: 'Built for TVET',
    description: 'Electrical, mechanical, ICT — courses designed around real trade syllabi.',
  },
];

const VALUES = [
  'Free access to past papers and study material',
  'Practical, trade-focused content — not generic',
  'Built with and for TVET students and teachers',
  'Available on low-bandwidth connections',
];

export default function About() {
  const { branding } = useBranding();
  const appName = branding?.appName || 'TVETGrid';

  return (
    <div className="space-y-16 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <Badge variant="info" className="mb-4">About</Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
          Built for TVET students, by people who believe in trades.
        </h1>
        <p className="text-base text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto">
          {appName} is a free learning platform that brings past papers, study notes, an
          AI tutor and live sessions into one place — purpose-built for Technical and
          Vocational Education and Training.
        </p>
      </section>

      {/* Mission + values */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Our mission</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            Every TVET student deserves the same study resources as students in traditional
            academic tracks. Yet past papers, notes and exam guidance are often scattered,
            incomplete or locked behind paywalls.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {appName} fixes that. We collect, organize and make all of it freely available
            — plus an AI tutor that's available whenever you're ready to study.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">What we believe</h2>
          <ul className="space-y-3">
            {VALUES.map((v, i) => (
              <li key={i} className="flex items-start gap-3">
                <HiCheckCircle className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--text-secondary)]">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Features */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">What you get</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2">Everything you need to pass — in one place</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{f.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-[var(--bg-tertiary)] p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Ready to start learning?</h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-xl mx-auto">
          Create a free account to bookmark papers, track progress, and get answers from the AI tutor.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button to="/register" size="lg">Create free account</Button>
          <Button to="/courses" variant="outline" size="lg" iconRight={<HiArrowRight className="w-4 h-4" />}>
            Browse courses
          </Button>
        </div>
      </section>

      {/* Contact */}
      {(branding?.supportEmail || branding?.supportPhone) && (
        <section className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Questions?{' '}
            {branding.supportEmail && (
              <a href={`mailto:${branding.supportEmail}`} className="text-[var(--brand-primary)] hover:underline">
                {branding.supportEmail}
              </a>
            )}
            {branding.supportEmail && branding.supportPhone && ' · '}
            {branding.supportPhone && (
              <a href={`tel:${branding.supportPhone}`} className="text-[var(--brand-primary)] hover:underline">
                {branding.supportPhone}
              </a>
            )}
          </p>
        </section>
      )}
    </div>
  );
}