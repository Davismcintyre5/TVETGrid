import { Link } from 'react-router-dom';
import {
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineMapPin,
} from 'react-icons/hi2';
import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import { Logo } from '@/components/ui';
import { useBranding } from '@/context/BrandingContext';
import { useLegalModal } from '@/components/public/LegalModal';

const SOCIAL_ICONS = {
  facebook: FaFacebookF,
  twitter: FaTwitter,
  instagram: FaInstagram,
  youtube: FaYoutube,
};

export default function PublicFooter() {
  const { branding } = useBranding();
  const { open: openLegal } = useLegalModal();
  const year = new Date().getFullYear();
  const {
    appName = 'TVETGrid',
    supportEmail,
    supportPhone,
    contactAddress,
    socialLinks = {},
  } = branding || {};

  const socials = Object.entries(socialLinks).filter(([, url]) => url && url.trim());

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand + socials */}
          <div className="sm:col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="mt-3 text-sm text-[var(--text-secondary)] max-w-xs">
              Past papers, notes and live learning for TVET students.
            </p>
            {socials.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                {socials.map(([key, url]) => {
                  const Icon = SOCIAL_ICONS[key];
                  if (!Icon) return null;
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)] transition-colors"
                      aria-label={key}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Learn */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/courses" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Courses
                </Link>
              </li>
              <li>
                <Link to="/papers" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Past Papers
                </Link>
              </li>
              <li>
                <Link to="/notes" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Notes
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  About
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Account</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/app/bookmarks" className="text-[var(--text-secondary)] hover:text-[var(--brand-primary)]">
                  Bookmarks
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              {supportEmail && (
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  >
                    <HiOutlineEnvelope className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">{supportEmail}</span>
                  </a>
                </li>
              )}
              {supportPhone && (
                <li>
                  <a
                    href={`tel:${supportPhone}`}
                    className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  >
                    <HiOutlinePhone className="w-4 h-4" />
                    {supportPhone}
                  </a>
                </li>
              )}
              {contactAddress && (
                <li className="inline-flex items-start gap-2 text-[var(--text-secondary)]">
                  <HiOutlineMapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{contactAddress}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            © {year} {appName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => openLegal('terms')}
              className="text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => openLegal('privacy')}
              className="text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => openLegal('cookies')}
              className="text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
            >
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}