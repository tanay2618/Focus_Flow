import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PRIORITIES, STATUSES, labelFor } from '../utils/constants.js';
import { MAX_BUBBLES, MAX_DOTS, buildMonthGrid, computeBubblePosition, dayKey, groupTasksByDay } from '../utils/calendar.js';

const CLOSE_DELAY = 250; // ms the bubbles stay open after the pointer leaves, so they can be reached and clicked

// Jan 1 2023 was a Sunday, so these come out Sunday-first in the user's language.
const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2023, 0, 1 + i);
  return { short: d.toLocaleDateString(undefined, { weekday: 'short' }), long: d.toLocaleDateString(undefined, { weekday: 'long' }) };
});

const focusVisible = (el) => {
  try { return el.matches(':focus-visible'); } catch { return true; }
};

/** The stack of bubbles for one date. Fixed-position, measured, then flipped to stay on screen. */
function BubbleStack({ id, anchorRef, tasks, label }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const shown = tasks.slice(0, MAX_BUBBLES);
  const hidden = tasks.length - shown.length;

  const place = useCallback(() => {
    const el = ref.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
    const maxHeight = viewport.height - 8;
    const rect = el.getBoundingClientRect();
    const next = {
      ...computeBubblePosition({
        anchor: anchor.getBoundingClientRect(),
        size: { width: rect.width, height: Math.min(rect.height, maxHeight) },
        viewport,
        // The stack has 10px of transparent padding, so a 2px gap puts the bubbles ~12px from the date
        // while the pointer never crosses dead space on its way from the date onto them.
        gap: 2,
        margin: 4,
      }),
      maxHeight,
    };
    setPos((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.side === next.side && prev.maxHeight === next.maxHeight ? prev : next));
  }, [anchorRef]);

  useLayoutEffect(() => { place(); }, [place, tasks]);
  useEffect(() => {
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true); // capture: also catches scrolling inside nested containers
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [place]);

  return (
    <ul
      ref={ref}
      id={id}
      className="cal__bubbles"
      aria-label={label}
      data-side={pos?.side}
      data-vertical={pos?.vertical}
      style={pos ? { left: pos.left, top: pos.top, maxHeight: pos.maxHeight } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      {shown.map((task) => (
        <li key={task.id}>
          <Link
            to={`/tasks/${task.id}/edit`}
            className={`bubble bubble--${task.priority}${task.status === 'completed' ? ' bubble--done' : ''}`}
          >
            <span className="bubble__title">{task.title}</span>
            <span className="bubble__meta">
              <span className="bubble__priority">{labelFor(PRIORITIES, task.priority)}</span>
              <span className="bubble__status">{labelFor(STATUSES, task.status)}</span>
            </span>
          </Link>
        </li>
      ))}
      {hidden > 0 && <li className="bubble bubble--more">Plus {hidden} more</li>}
    </ul>
  );
}

function DayCell({ cell, dayTasks, todayKey, isOpen, controls }) {
  const buttonRef = useRef(null);
  const pointerKind = useRef('');
  const popId = useId();

  const has = dayTasks.length > 0;
  const isToday = cell.key === todayKey;
  const isPastDue = cell.key < todayKey && dayTasks.some((t) => t.status !== 'completed'); // local day keys compare correctly as strings
  const classes = ['cal__day', !cell.inMonth && 'cal__day--outside', isToday && 'cal__day--today', has && 'cal__day--has', isPastDue && 'cal__day--overdue']
    .filter(Boolean).join(' ');

  if (!has) {
    return (
      <td className="cal__cell">
        <div className={`${classes} cal__day--empty`} aria-current={isToday ? 'date' : undefined}>
          <span className="cal__num">{cell.day}</span>
        </div>
      </td>
    );
  }

  const fullDate = cell.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const count = dayTasks.length;
  const ariaLabel = `${fullDate}: ${count} ${count === 1 ? 'task' : 'tasks'} due${isPastDue ? ', overdue' : ''}${isToday ? ', today' : ''}`;

  return (
    <td
      className="cal__cell"
      data-cal-open={isOpen ? 'true' : undefined}
      // Hover opens only for a real mouse. Touch is handled by tapping (below).
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') controls.open(cell.key); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') controls.closeSoon(cell.key); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) controls.closeFor(cell.key); }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={classes}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popId : undefined}
        onPointerDown={(e) => { pointerKind.current = e.pointerType; }}
        onKeyDown={() => { pointerKind.current = 'keyboard'; }}
        onFocus={(e) => { if (!controls.skipFocusOpen.current && focusVisible(e.currentTarget)) controls.open(cell.key); }}
        onClick={() => {
          // A tap toggles; a mouse click or Enter/Space keeps the bubbles open.
          if (isOpen && (pointerKind.current === 'touch' || pointerKind.current === 'pen')) controls.close();
          else controls.open(cell.key);
        }}
      >
        <span className="cal__num">{cell.day}</span>
        <span className="cal__dots" aria-hidden="true">
          {dayTasks.slice(0, MAX_DOTS).map((t) => (
            <span key={t.id} className={`cal__dot cal__dot--${t.priority}${t.status === 'completed' ? ' cal__dot--done' : ''}`} />
          ))}
        </span>
      </button>
      {isOpen && <BubbleStack id={popId} anchorRef={buttonRef} tasks={dayTasks} label={`Tasks due ${fullDate}`} />}
    </td>
  );
}

export default function TaskCalendar({ tasks = [], now = new Date() }) {
  const [view, setView] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }));
  const [openKey, setOpenKey] = useState(null);
  const timer = useRef(null);
  const skipFocusOpen = useRef(false);

  const todayKey = dayKey(now);
  const byDay = useMemo(() => groupTasksByDay(tasks), [tasks]);
  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthHasTasks = cells.some((c) => c.inMonth && byDay.has(c.key));

  const clearTimer = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);
  const controls = useMemo(() => ({
    skipFocusOpen,
    open: (key) => { clearTimer(); setOpenKey(key); },
    close: () => { clearTimer(); setOpenKey(null); },
    closeFor: (key) => setOpenKey((k) => (k === key ? null : k)),
    closeSoon: (key) => {
      clearTimer();
      timer.current = setTimeout(() => { timer.current = null; setOpenKey((k) => (k === key ? null : k)); }, CLOSE_DELAY);
    },
  }), [clearTimer]);
  useEffect(() => clearTimer, [clearTimer]);

  // While bubbles are open: a tap / click anywhere else closes them, and Escape closes them.
  useEffect(() => {
    if (!openKey) return undefined;
    const onPointerDown = (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-cal-open="true"]')) controls.close();
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      const cell = document.querySelector('[data-cal-open="true"]');
      const button = cell?.querySelector('.cal__day');
      if (cell && button && cell.contains(document.activeElement) && document.activeElement !== button) {
        skipFocusOpen.current = true; // hand focus back to the date without re-opening the bubbles
        button.focus();
        skipFocusOpen.current = false;
      }
      controls.close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openKey, controls]);

  const go = (delta) => {
    controls.close();
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const goToday = () => {
    controls.close();
    setView({ year: now.getFullYear(), month: now.getMonth() });
  };

  const weeks = Array.from({ length: 6 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <section className="section calendar" aria-label="Task calendar">
      <div className="section__head">
        <h2 aria-live="polite">{monthLabel}</h2>
        <div className="cal__nav" role="group" aria-label="Change month">
          <button type="button" className="btn btn--sm btn--ghost cal__arrow" onClick={() => go(-1)} aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={goToday}>Today</button>
          <button type="button" className="btn btn--sm btn--ghost cal__arrow" onClick={() => go(1)} aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="card cal__card">
        <table className="cal__table">
          <caption className="sr-only">Tasks by due date, {monthLabel}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((w) => <th key={w.long} scope="col" abbr={w.long}>{w.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((cell) => (
                  <DayCell key={cell.key} cell={cell} dayTasks={byDay.get(cell.key) ?? []} todayKey={todayKey}
                    isOpen={openKey === cell.key} controls={controls} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!monthHasTasks && <p className="cal__note muted">No tasks due in {monthLabel}.</p>}

        <ul className="cal__legend" aria-label="Legend">
          {[...PRIORITIES].reverse().map((p) => (
            <li key={p.value}><span className={`cal__dot cal__dot--${p.value}`} aria-hidden="true" />{p.label}</li>
          ))}
          <li className="cal__legend-sep"><span className="cal__key cal__key--today" aria-hidden="true" />Today</li>
          <li><span className="cal__key cal__key--overdue" aria-hidden="true" />Past due</li>
        </ul>
      </div>
    </section>
  );
}
