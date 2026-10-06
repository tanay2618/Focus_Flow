import { describe, it, expect } from 'vitest';
import { buildMonthGrid, computeBubblePosition, dayKey, groupTasksByDay } from '../utils/calendar.js';

const task = (id, over = {}) => ({ id, title: `T${id}`, status: 'pending', priority: 'medium', dueDate: new Date(2026, 9, 5, 12).toISOString(), ...over });

describe('dayKey (local date, never the ISO/UTC date)', () => {
  it('uses the local year, month and day', () => {
    expect(dayKey(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05');   // 00:30 local
    expect(dayKey(new Date(2026, 9, 5, 23, 45))).toBe('2026-10-05');  // 23:45 local
    expect(dayKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
  it('accepts the ISO strings the API returns', () => {
    expect(dayKey(new Date(2026, 9, 5, 0, 30).toISOString())).toBe('2026-10-05');
    expect(dayKey(new Date(2026, 9, 5, 23, 45).toISOString())).toBe('2026-10-05');
  });
  it('puts early-morning and late-night tasks on the right day (the bug an ISO-slice would cause)', () => {
    const early = task(1, { dueDate: new Date(2026, 9, 5, 0, 30).toISOString() });
    const late = task(2, { dueDate: new Date(2026, 9, 5, 23, 45).toISOString() });
    const map = groupTasksByDay([early, late]);
    expect([...map.keys()]).toEqual(['2026-10-05']);
    expect(map.get('2026-10-05')).toHaveLength(2);
  });
});

describe('buildMonthGrid', () => {
  it('is Sunday-first, 42 cells, and fills with neighbouring months', () => {
    const cells = buildMonthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(cells).toHaveLength(42);
    expect(cells[0].date.getDay()).toBe(0);
    expect(cells[0].key).toBe('2026-09-27');
    expect(cells[0].inMonth).toBe(false);
    expect(cells[4].key).toBe('2026-10-01');
    expect(cells[4].inMonth).toBe(true);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
    expect(cells[41].key).toBe('2026-11-07');
    expect(cells.every((c, i) => c.date.getDay() === i % 7)).toBe(true);
  });
  it('handles a month that starts on Sunday, February and year boundaries', () => {
    expect(buildMonthGrid(2026, 1)[0].key).toBe('2026-02-01'); // Feb 2026 starts on a Sunday
    expect(buildMonthGrid(2026, 1).filter((c) => c.inMonth)).toHaveLength(28);
    expect(buildMonthGrid(2028, 1).filter((c) => c.inMonth)).toHaveLength(29); // leap year
    const jan = buildMonthGrid(2027, 0);
    expect(jan[0].key).toBe('2026-12-27');
    const dec = buildMonthGrid(2026, 11);
    expect(dec.at(-1).key).toBe('2027-01-09');
  });
  it('never repeats or skips a day (DST safe)', () => {
    for (const [y, m] of [[2026, 2], [2026, 9], [2026, 10], [2026, 3]]) {
      const keys = buildMonthGrid(y, m).map((c) => c.key);
      expect(new Set(keys).size).toBe(42);
      expect([...keys].sort()).toEqual(keys);
    }
  });
});

describe('groupTasksByDay ordering', () => {
  it('lists unfinished first, then by priority, then by time', () => {
    const at = (h) => new Date(2026, 9, 5, h).toISOString();
    const map = groupTasksByDay([
      task(1, { priority: 'urgent', status: 'completed', dueDate: at(9) }),
      task(2, { priority: 'low', dueDate: at(9) }),
      task(3, { priority: 'high', dueDate: at(15) }),
      task(4, { priority: 'high', dueDate: at(8) }),
      task(5, { priority: 'urgent', dueDate: at(20) }),
    ]);
    expect(map.get('2026-10-05').map((t) => t.id)).toEqual([5, 4, 3, 2, 1]);
  });
});

describe('computeBubblePosition: stays on screen and flips as needed', () => {
  const viewport = { width: 1280, height: 800 };
  const size = { width: 272, height: 300 };
  const cell = (left, top, w = 130, h = 72) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h });
  const inside = (p) => p.left >= 8 && p.top >= 8 && p.left + size.width <= viewport.width - 8 && p.top + size.height <= viewport.height - 8;

  it('opens to the right of a first-column date', () => {
    const p = computeBubblePosition({ anchor: cell(60, 200), size, viewport });
    expect(p.side).toBe('right');
    expect(p.left).toBe(60 + 130 + 8);
    expect(inside(p)).toBe(true);
  });
  it('flips to the left for a last-column date', () => {
    const p = computeBubblePosition({ anchor: cell(1090, 200), size, viewport });
    expect(p.side).toBe('left');
    expect(p.left).toBe(1090 - 8 - 272);
    expect(inside(p)).toBe(true);
  });
  it('grows upward when there is no room below, and never leaves the viewport', () => {
    const p = computeBubblePosition({ anchor: cell(60, 700), size, viewport });
    expect(p.vertical).toBe('up');
    expect(p.top).toBe(700 + 72 - 300);
    expect(inside(p)).toBe(true);
    expect(inside(computeBubblePosition({ anchor: cell(1090, 790), size, viewport }))).toBe(true);
    expect(inside(computeBubblePosition({ anchor: cell(0, 0), size, viewport }))).toBe(true);
  });
  it('on a phone: still opens beside the date when it fits, otherwise goes below or above, clamped to the screen', () => {
    const phone = { width: 390, height: 780 };
    const small = { width: 268, height: 160 };
    const c = (left, top) => cell(left, top, 50, 52);
    const within = (p, vp) => p.left >= 8 && p.top >= 8 && p.left + small.width <= vp.width - 8 && p.top + small.height <= vp.height - 8;

    expect(computeBubblePosition({ anchor: c(8, 400), size: small, viewport: phone }).side).toBe('right');   // first column
    expect(computeBubblePosition({ anchor: c(332, 400), size: small, viewport: phone }).side).toBe('left');  // last column

    const mid = computeBubblePosition({ anchor: c(170, 400), size: small, viewport: phone });                // middle: no side room
    expect(mid.side).toBe('below');
    expect(mid.top).toBe(400 + 52 + 8);
    const high = computeBubblePosition({ anchor: c(170, 700), size: small, viewport: phone });               // near the bottom edge
    expect(high.side).toBe('above');
    expect(high.top).toBe(700 - 8 - 160);

    const narrow = { width: 320, height: 700 };                                                              // very small phone
    const edge = computeBubblePosition({ anchor: c(8, 300), size: small, viewport: narrow });
    expect(edge.side).toBe('below');
    expect(edge.left).toBe(8);                                                                               // clamped to the margin, not cut off
    const edgeRight = computeBubblePosition({ anchor: c(262, 300), size: small, viewport: narrow });
    expect(edgeRight.left + small.width).toBe(narrow.width - 8);
    for (const p of [mid, high]) expect(within(p, phone)).toBe(true);
    for (const p of [edge, edgeRight]) expect(within(p, narrow)).toBe(true);
  });
  it('clamps an oversized stack to the top margin instead of going off screen', () => {
    const tall = { width: 272, height: 900 };
    const p = computeBubblePosition({ anchor: cell(60, 300), size: tall, viewport });
    expect(p.top).toBe(8);
  });
});
