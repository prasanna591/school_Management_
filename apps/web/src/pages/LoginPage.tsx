import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError, type LoginPortal } from '../lib/api';
import { useAuth } from '../lib/auth';
import { resolveLoginTarget } from '../lib/routing';
import { Icon } from '../components/Icon';
import './LoginPage.css';

/**
 * The SmartSchool logo.
 *
 * `public/site/logo.png` holds the original artwork with the cream background
 * removed (see the note in LoginPage.css). Because the mark is transparent it
 * sits directly on both the navy panel and the white card — no tile, no ring,
 * no crop. It is referenced exactly once per view, so the crest never appears
 * twice. `object-fit: contain` plus a 1:1 box keeps the artwork undistorted.
 */
function Logo({ className }: { className?: string }) {
  return (
    <img
      className={`login-logo${className ? ` ${className}` : ''}`}
      src="/site/logo.png"
      alt="SmartSchool"
      width={384}
      height={384}
      decoding="async"
    />
  );
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

interface PortalLoginProps {
  portal: LoginPortal;
  helper: string;
  headline: string;
  points: Array<{
    icon: 'attendance' | 'marks' | 'finance' | 'messages' | 'bus' | 'shield';
    label: string;
  }>;
}

const PORTALS: Array<{
  portal: LoginPortal;
  label: string;
  to: string;
  icon: 'shield' | 'marks' | 'parents';
}> = [
  { portal: 'admin', label: 'Admin', to: '/login', icon: 'shield' },
  { portal: 'teacher', label: 'Teacher', to: '/login/teacher', icon: 'marks' },
  { portal: 'parent', label: 'Parent', to: '/login/parent', icon: 'parents' },
];

/**
 * Each portal gets its own card heading and helper line, so switching tabs
 * (which is a route change) reads as a real change of place, not just a
 * highlighted pill.
 */
const PORTAL_HEADING: Record<LoginPortal, string> = {
  admin: 'Manage your school',
  teacher: 'Pick up where you left off',
  parent: 'See how your child is doing',
};

/** The one short line under the role tabs, per portal. */
const ROLE_HELPER: Record<LoginPortal, string> = {
  admin: 'Sign in with your administrator account to open today’s school desk.',
  teacher: 'Your register, classes and homework are waiting where you left them.',
  parent: 'Attendance, results and notices for your child, all in one place.',
};

/**
 * Short, plain-language tips. One is picked per day (local time) so the line
 * rewards a returning visitor without ever becoming a nagging banner.
 */
const TIPS: string[] = [
  'The eye icon lets you double-check your password before you sign in.',
  'Attendance marked before lunch is on the dashboard the same morning.',
  'Parents can message a teacher straight from the Messages tab — no phone tag.',
  'Report cards print cleanly from Reports → Report cards.',
  'Switching roles? The tabs above take you to each portal’s own sign-in.',
];

function tipOfTheDay(): string {
  const day = Math.floor(Date.now() / 86_400_000);
  return TIPS[day % TIPS.length] ?? TIPS[0] ?? '';
}

/**
 * Where a forgotten password goes when there is no self-service reset flow:
 * the school’s public contact page, which reaches a real administrator.
 * Purely a destination — nothing about the sign-in request changes.
 */
const FORGOT_PASSWORD_TO = '/site/contact';

/**
 * Client-side pre-checks only. These mirror the server contract in
 * `packages/shared/src/schemas/auth.schema.ts` so the form does not send a
 * request the API is certain to reject — they never replace server validation,
 * which remains the authority for both fields.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** `loginSchema`: z.string().min(8, 'Password must be at least 8 characters').max(128) */
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

/** Where "Remember me" keeps the email address (never the password). */
const REMEMBERED_EMAIL_KEY = 'smartschool.rememberedEmail';

function PortalLogin({ portal, helper, headline, points }: PortalLoginProps) {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? null;
  const [email, setEmail] = useState(
    () => window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '',
  );
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(
    () => window.localStorage.getItem(REMEMBERED_EMAIL_KEY) !== null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });

  // Every role shares the same navy / teal palette; the teacher sign-in still
  // sets the scoped "navy" attribute (index.css §2b) so the login screen picks
  // up the same hero/accent tuning as the dashboard behind it.
  const navyTheme = portal === 'teacher';
  useEffect(() => {
    const root = document.documentElement;
    if (!navyTheme) {
      delete root.dataset.theme;
      return;
    }
    root.dataset.theme = 'navy';
    return () => {
      delete root.dataset.theme;
    };
  }, [navyTheme]);

  if (!loading && user) {
    return <Navigate to={resolveLoginTarget(user.role, from)} replace />;
  }

  const trimmedEmail = email.trim();
  const emailError = !trimmedEmail
    ? 'Enter your email address.'
    : EMAIL_RE.test(trimmedEmail)
      ? null
      : 'Enter a valid email address, like name@school.com.';
  // Wording matches the server's own message so the two never disagree.
  const passwordError = !password
    ? 'Enter your password.'
    : password.length < MIN_PASSWORD
      ? 'Password must be at least 8 characters.'
      : password.length > MAX_PASSWORD
        ? 'Password must be 128 characters or fewer.'
        : null;

  const showEmailError = touched.email ? emailError : null;
  const showPasswordError = touched.password ? passwordError : null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    // Reveal any inline messages rather than silently doing nothing.
    setTouched({ email: true, password: true });
    if (emailError || passwordError) return;

    // UI-only courtesy: remember the address (never the password) so the next
    // visit starts one field filled in. The sign-in request itself is
    // unchanged, and unchecking clears it.
    try {
      if (remember) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch {
      /* private browsing may refuse storage — sign-in must not care */
    }

    setSubmitting(true);
    try {
      const session = await login(trimmedEmail, password, portal);
      navigate(resolveLoginTarget(session.role, from), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      {/* ---- Left: brand panel (hidden on small screens) ---------------- */}
      <aside className="login__aside">
        <Logo className="login__aside-logo" />
        <div className="login__aside-body">
          <h2 className="login__tagline">{headline}</h2>
          <p className="login__aside-lead">
            One place for the whole school to work from — no spreadsheets, no chasing paper.
          </p>
          <ul className="login__points">
            {points.map((point) => (
              <li key={point.label}>
                <span className="login__point-icon" aria-hidden="true">
                  <Icon name={point.icon} size={16} />
                </span>
                <span>{point.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="login__aside-footer">
          © {new Date().getFullYear()} SmartSchool · School Management System
        </p>
      </aside>

      {/* ---- Right: sign-in card --------------------------------------- */}
      <main className="login__main">
        <div className="login__panel">
          {/* Client-side jump to the public marketing site — same router as
              everything else, so no page reload. */}
          <Link className="login__home-link" to="/site">
            <Icon name="home" size={15} aria-hidden="true" />
            Home
          </Link>

          {/* On mobile the aside is hidden, so the card carries the logo. */}
          <Logo className="login__card-logo" />

          <header className="login__header">
            <p className="login__eyebrow">Welcome back</p>
            <h1 className="login__title">{PORTAL_HEADING[portal]}</h1>
            <p className="login__greeting">Good to see you again.</p>
          </header>

          <div className="login__roles" role="group" aria-label="Choose the portal you sign in to">
            {PORTALS.map((item) => {
              const active = item.portal === portal;
              return (
                <Link
                  key={item.portal}
                  to={item.to}
                  className={cx('login__role', active && 'is-active')}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <p className="login__helper">{helper}</p>

          <form className="login__form" onSubmit={onSubmit} noValidate>
            {error ? (
              <div className="alert alert--error login__alert" role="alert">
                {error}
              </div>
            ) : null}

            <div className="login__field">
              <label className="login__label" htmlFor="login-email">
                Email
              </label>
              <div className="login__control">
                <span className="login__control-icon" aria-hidden="true">
                  <Icon name="mail" size={16} />
                </span>
                <input
                  id="login-email"
                  className={cx('login__input', showEmailError && 'is-invalid')}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setTouched((state) => ({ ...state, email: true }))}
                  placeholder="name@school.com"
                  aria-invalid={showEmailError ? true : undefined}
                  aria-describedby={showEmailError ? 'login-email-error' : undefined}
                />
              </div>
              {showEmailError ? (
                <p className="login__error" id="login-email-error">
                  <Icon name="alert" size={14} aria-hidden="true" />
                  {showEmailError}
                </p>
              ) : null}
            </div>

            <div className="login__field">
              <label className="login__label" htmlFor="login-password">
                Password
              </label>
              <div className="login__control">
                <span className="login__control-icon" aria-hidden="true">
                  <Icon name="lock" size={16} />
                </span>
                <input
                  id="login-password"
                  className={cx(
                    'login__input',
                    'login__input--password',
                    showPasswordError && 'is-invalid',
                  )}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((state) => ({ ...state, password: true }))}
                  placeholder="Enter your password"
                  aria-invalid={showPasswordError ? true : undefined}
                  aria-describedby={showPasswordError ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="login__reveal"
                  onClick={() => {
                    setShowPassword((shown) => !shown);
                    // The toggle steals focus from the field; mark as touched so
                    // a short password still shows its message afterwards.
                    setTouched((state) => ({ ...state, password: true }));
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
                </button>
              </div>
              {showPasswordError ? (
                <p className="login__error" id="login-password-error">
                  <Icon name="alert" size={14} aria-hidden="true" />
                  {showPasswordError}
                </p>
              ) : null}
            </div>

            <div className="login__options">
              <label className="login__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
              <Link
                className="login__forgot"
                to={FORGOT_PASSWORD_TO}
                title="Contact your school administrator to reset your password"
              >
                Forgot password?
              </Link>
            </div>

            {/* The button stays visually active at all times; a click on an
                incomplete form reveals the inline messages above. Only genuine
                submission locks it (with the spinner). */}
            <button
              type="submit"
              className={cx('login__submit', submitting && 'is-loading')}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="login__spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {import.meta.env.VITE_DEMO_MODE === 'true' ? (
              <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--login-muted, var(--muted))', textAlign: 'center' }}>Demo Quick Login (password: demo1234)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <button type="button" className="login__submit" style={{ padding: '8px' }} onClick={async () => { setEmail('principal@demo.school'); setPassword('demo1234'); setRemember(true); window.localStorage.setItem(REMEMBERED_EMAIL_KEY, 'principal@demo.school'); setTouched({ email: true, password: true }); try { setSubmitting(true); await login('principal@demo.school', 'demo1234', portal); const target = resolveLoginTarget(user?.role); navigate(target === '/' ? '/' : target, { replace: true, state: from ? { from } : undefined }); } catch (e) { setError((e as ApiError)?.message || (e as Error)?.message || 'Login failed'); } finally { setSubmitting(false); } }}>Principal</button>
                  <button type="button" className="login__submit" style={{ padding: '8px' }} onClick={async () => { setEmail('teacher@demo.school'); setPassword('demo1234'); setRemember(true); window.localStorage.setItem(REMEMBERED_EMAIL_KEY, 'teacher@demo.school'); setTouched({ email: true, password: true }); try { setSubmitting(true); await login('teacher@demo.school', 'demo1234', portal); const target = resolveLoginTarget(user?.role); navigate(target === '/' ? '/' : target, { replace: true, state: from ? { from } : undefined }); } catch (e) { setError((e as ApiError)?.message || (e as Error)?.message || 'Login failed'); } finally { setSubmitting(false); } }}>Teacher</button>
                  <button type="button" className="login__submit" style={{ padding: '8px' }} onClick={async () => { setEmail('accountant@demo.school'); setPassword('demo1234'); setRemember(true); window.localStorage.setItem(REMEMBERED_EMAIL_KEY, 'accountant@demo.school'); setTouched({ email: true, password: true }); try { setSubmitting(true); await login('accountant@demo.school', 'demo1234', portal); const target = resolveLoginTarget(user?.role); navigate(target === '/' ? '/' : target, { replace: true, state: from ? { from } : undefined }); } catch (e) { setError((e as ApiError)?.message || (e as Error)?.message || 'Login failed'); } finally { setSubmitting(false); } }}>Accountant</button>
                  <button type="button" className="login__submit" style={{ padding: '8px' }} onClick={async () => { setEmail('parent@demo.school'); setPassword('demo1234'); setRemember(true); window.localStorage.setItem(REMEMBERED_EMAIL_KEY, 'parent@demo.school'); setTouched({ email: true, password: true }); try { setSubmitting(true); await login('parent@demo.school', 'demo1234', portal); const target = resolveLoginTarget(user?.role); navigate(target === '/' ? '/' : target, { replace: true, state: from ? { from } : undefined }); } catch (e) { setError((e as ApiError)?.message || (e as Error)?.message || 'Login failed'); } finally { setSubmitting(false); } }}>Parent</button>
                </div>
              </div>
            ) : null}
          </form>

          <p className="login__tip">
            <span className="login__tip-tag">Tip of the day</span>
            <span>{tipOfTheDay()}</span>
          </p>
        </div>
      </main>
    </div>
  );
}

/** Platform / administrator sign-in. */
export function LoginPage() {
  return (
    <PortalLogin
      portal="admin"
      helper={ROLE_HELPER.admin}
      headline="A calmer day for the school office."
      points={[
        { icon: 'attendance', label: 'Attendance that the office sees the same morning' },
        { icon: 'finance', label: 'Invoices, part-payments and outstanding balances' },
        { icon: 'marks', label: 'Marks, grades and report cards, worked out for you' },
      ]}
    />
  );
}

/** Teacher portal sign-in. */
export function TeacherLoginPage() {
  return (
    <PortalLogin
      portal="teacher"
      helper={ROLE_HELPER.teacher}
      headline="Less admin, more time teaching."
      points={[
        { icon: 'attendance', label: 'Mark the register for a whole section in one pass' },
        { icon: 'marks', label: 'Record marks, grades and remarks' },
        { icon: 'messages', label: 'Assign homework and share resources' },
      ]}
    />
  );
}

/** Parent portal sign-in. */
export function ParentLoginPage() {
  return (
    <PortalLogin
      portal="parent"
      helper={ROLE_HELPER.parent}
      headline="See how the school day went."
      points={[
        { icon: 'attendance', label: 'Follow attendance and academic results' },
        { icon: 'marks', label: 'Review marks and teacher remarks' },
        { icon: 'messages', label: 'Keep up with homework and notices' },
      ]}
    />
  );
}
