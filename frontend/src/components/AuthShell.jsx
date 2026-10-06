import BrandMark from './BrandMark.jsx';

const SAMPLE = [
  { title: 'Operating Systems lab report', due: 'Tomorrow, 11:59 pm', p: 'high', label: 'High' },
  { title: 'DBMS mid-term revision', due: 'In 3 days', p: 'urgent', label: 'Urgent' },
  { title: 'Read chapter 7: Networks', due: 'In 5 days', p: 'low', label: 'Low' },
];

/** Two-column frame for sign-in and sign-up: a short promise on the left, the form on the right. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__intro" aria-hidden="true">
        <div className="auth__brand"><BrandMark size={32} /><span>Focus Flow</span></div>
        <h2>See what is due before it is due.</h2>
        <p>Deadlines, priorities and today's plan in one calm place.</p>
        <ul className="sample">
          {SAMPLE.map((s) => (
            <li key={s.title} className={`sample__row task--${s.p}`}>
              <span className="sample__title">{s.title}</span>
              <span className="sample__due">{s.due}</span>
              <span className={`badge badge--p-${s.p}`}>{s.label}</span>
            </li>
          ))}
        </ul>
      </aside>

      <section className="auth__panel">
        <div className="auth__card">
          <div className="auth__brand auth__brand--mobile"><BrandMark size={28} /><span>Focus Flow</span></div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth__footer">{footer}</p>
        </div>
      </section>
    </div>
  );
}
