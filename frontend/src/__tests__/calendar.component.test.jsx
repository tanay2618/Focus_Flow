import { describe, it, expect } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import TaskCalendar from '../components/TaskCalendar.jsx';

const NOW = new Date(2026, 9, 3, 10, 0, 0); // Saturday 3 Oct 2026, 10:00 local
const iso = (m, d, h = 12) => new Date(2026, m, d, h).toISOString();
let nextId = 1;
const mk = (over = {}) => ({ id: nextId++, title: `Task ${nextId - 1}`, status: 'pending', priority: 'medium', dueDate: iso(9, 20), ...over });

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
function setup(tasks, props = {}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<><TaskCalendar tasks={tasks} now={NOW} {...props} /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}
const dateButton = (name) => screen.getByRole('button', { name });
const bubbles = () => within(screen.getByRole('list', { name: /Tasks due/ })).queryAllByRole('listitem');

describe('layout', () => {
  it('shows the month and year, Sunday-first weekdays and 42 date boxes', () => {
    setup([]);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/October\s+2026/);
    const heads = screen.getAllByRole('columnheader').map((h) => h.getAttribute('abbr'));
    expect(heads).toHaveLength(7);
    expect(heads[0]).toMatch(/Sunday/);
    expect(heads[6]).toMatch(/Saturday/);
    expect(document.querySelectorAll('.cal__cell')).toHaveLength(42);
    expect(document.querySelectorAll('.cal__day--outside').length).toBe(11); // 4 Sept days + 7 Nov days
    expect(screen.getByText(/No tasks due in October/)).toBeInTheDocument();
  });

  it('outlines today only', () => {
    setup([]);
    const today = document.querySelectorAll('.cal__day--today');
    expect(today).toHaveLength(1);
    expect(today[0]).toHaveTextContent('3');
    expect(today[0]).not.toHaveClass('cal__day--outside');
  });

  it('has a legend with every priority colour', () => {
    setup([]);
    const legend = screen.getByRole('list', { name: 'Legend' });
    for (const label of ['Urgent', 'High', 'Medium', 'Low', 'Today', 'Past due']) expect(within(legend).getByText(label)).toBeInTheDocument();
  });
});

describe('month navigation', () => {
  it('previous, next and today buttons', async () => {
    const user = setup([]);
    const heading = screen.getByRole('heading', { level: 2 });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(heading).toHaveTextContent(/November\s+2026/);
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(heading).toHaveTextContent(/December\s+2026/);
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(heading).toHaveTextContent(/January\s+2027/); // year rolls over
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(heading).toHaveTextContent(/October\s+2026/);
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(heading).toHaveTextContent(/August\s+2026/);
    expect(document.querySelectorAll('.cal__day--today')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(document.querySelectorAll('.cal__day--today')).toHaveLength(1);
  });

  it('shows tasks that belong to the month being browsed', async () => {
    const user = setup([mk({ title: 'Nov exam', dueDate: iso(10, 15) })]);
    expect(screen.queryByRole('button', { name: /15 November 2026|November 15, 2026/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('button', { name: /(November 15, 2026|15 November 2026).*1 task due/ })).toBeInTheDocument();
  });
});

describe('date highlighting and dots', () => {
  it('tints dates with tasks and shows up to three priority-coloured dots, one per task', () => {
    const tasks = [
      mk({ priority: 'urgent', dueDate: iso(9, 20) }), mk({ priority: 'high', dueDate: iso(9, 20) }),
      mk({ priority: 'medium', dueDate: iso(9, 20) }), mk({ priority: 'low', dueDate: iso(9, 20) }),
      mk({ priority: 'low', dueDate: iso(9, 22) }),
    ];
    setup(tasks);
    const busy = dateButton(/20 October 2026|October 20, 2026|Tuesday.*20/);
    expect(busy).toHaveClass('cal__day--has');
    const dots = [...busy.querySelectorAll('.cal__dot')].map((d) => [...d.classList].find((c) => /--(urgent|high|medium|low)$/.test(c)));
    expect(dots).toEqual(['cal__dot--urgent', 'cal__dot--high', 'cal__dot--medium']); // 4 tasks, 3 dots, most important first
    expect(dateButton(/22 October 2026|October 22, 2026|Thursday.*22/).querySelectorAll('.cal__dot')).toHaveLength(1);
    expect(document.querySelectorAll('.cal__day--has')).toHaveLength(2);
  });

  it('outlines past dates that still have unfinished tasks, and nothing else', () => {
    setup([
      mk({ dueDate: iso(9, 1) }),                                            // past, unfinished -> red
      mk({ dueDate: iso(9, 2), status: 'completed' }),                       // past, all done   -> no red
      mk({ dueDate: iso(9, 4), status: 'completed' }), mk({ dueDate: iso(9, 4), status: 'in_progress' }), // past, mixed -> red
      mk({ dueDate: iso(9, 3, 8) }),                                         // today, earlier hour -> today outline, not red
      mk({ dueDate: iso(9, 10) }),                                           // future -> not red
    ]);
    const overdue = [...document.querySelectorAll('.cal__day--overdue')].map((d) => d.querySelector('.cal__num').textContent);
    expect(overdue).toEqual(['1']);
    expect(document.querySelector('.cal__day--today')).not.toHaveClass('cal__day--overdue');
    expect(dateButton(/2 October 2026|October 2, 2026|Friday.*2/)).not.toHaveClass('cal__day--overdue');
  });

  it('flags the overdue date for screen readers', () => {
    setup([mk({ dueDate: iso(9, 1) })]);
    expect(dateButton(/1 task due, overdue/)).toBeInTheDocument();
  });
});

describe('hover bubbles', () => {
  const day20 = (extra) => mk({ dueDate: iso(9, 20), ...extra });
  const opener = () => dateButton(/20 October 2026|October 20, 2026|Tuesday.*20/);

  it('opens one bubble per task, coloured by that task\'s own priority', async () => {
    const user = setup([
      day20({ title: 'Lab viva', priority: 'urgent', status: 'in_progress' }), day20({ title: 'Essay', priority: 'high' }),
      day20({ title: 'Reading', priority: 'medium' }), day20({ title: 'Tidy notes', priority: 'low', status: 'completed' }),
    ]);
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
    await user.hover(opener());
    const items = bubbles();
    expect(items).toHaveLength(4);
    const byTitle = Object.fromEntries(items.map((li) => [li.querySelector('.bubble__title').textContent, li.querySelector('.bubble')]));
    expect(byTitle['Lab viva']).toHaveClass('bubble--urgent');
    expect(byTitle['Essay']).toHaveClass('bubble--high');
    expect(byTitle['Reading']).toHaveClass('bubble--medium');
    expect(byTitle['Tidy notes']).toHaveClass('bubble--low');
    expect(byTitle['Lab viva']).toHaveTextContent('Urgent');
    expect(byTitle['Lab viva']).toHaveTextContent('In progress');
    expect(byTitle['Essay']).toHaveTextContent('Pending');
    expect(byTitle['Tidy notes']).toHaveClass('bubble--done');
    expect(byTitle['Tidy notes']).toHaveTextContent('Completed');
    expect(byTitle['Essay']).not.toHaveClass('bubble--done');
  });

  it('two tasks give two bubbles', async () => {
    const user = setup([day20(), day20()]);
    await user.hover(opener());
    expect(bubbles()).toHaveLength(2);
  });

  it('shows five bubbles and a "Plus N more" bubble when there are more than five', async () => {
    const six = Array.from({ length: 8 }, (_, i) => day20({ title: `Job ${i}` }));
    const user = setup(six);
    await user.hover(opener());
    const items = bubbles();
    expect(items).toHaveLength(6);
    expect(items.slice(0, 5).every((li) => li.querySelector('a'))).toBe(true);
    expect(items[5]).toHaveTextContent('Plus 3 more');
    expect(items[5].querySelector('a')).toBeNull();
  });

  it('exactly five tasks give five bubbles and no "Plus" bubble', async () => {
    const user = setup(Array.from({ length: 5 }, () => day20()));
    await user.hover(opener());
    expect(bubbles()).toHaveLength(5);
    expect(screen.queryByText(/Plus \d+ more/)).not.toBeInTheDocument();
  });

  it('stays open while the pointer moves from the date onto a bubble, and closes shortly after it leaves', async () => {
    const user = setup([day20({ title: 'Reachable' })]);
    await user.hover(opener());
    await user.unhover(opener());                       // pointer leaves the date...
    await user.hover(screen.getByRole('link', { name: /Reachable/ })); // ...and lands on the bubble within the delay
    await new Promise((r) => setTimeout(r, 450));
    expect(bubbles()).toHaveLength(1);                   // still open: the delay was cancelled
    await user.unhover(screen.getByRole('link', { name: /Reachable/ }));
    expect(bubbles()).toHaveLength(1);                   // short delay: not closed instantly
    await waitFor(() => expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument(), { timeout: 1500 });
  });

  it('clicking a bubble opens that task\'s edit page', async () => {
    const task = day20({ title: 'Go here' });
    const user = setup([task, day20({ title: 'Other' })]);
    await user.hover(opener());
    await user.click(screen.getByRole('link', { name: /Go here/ }));
    expect(screen.getByTestId('where')).toHaveTextContent(`/tasks/${task.id}/edit`);
  });

  it('moving to another date switches the bubbles instead of stacking them', async () => {
    const user = setup([day20({ title: 'A' }), mk({ title: 'B', dueDate: iso(9, 22) })]);
    await user.hover(opener());
    await user.hover(dateButton(/22 October 2026|October 22, 2026|Thursday.*22/));
    expect(document.querySelectorAll('.cal__bubbles')).toHaveLength(1);
    expect(bubbles()[0]).toHaveTextContent('B');
  });
});

describe('keyboard and touch', () => {
  const opener = () => dateButton(/20 October 2026|October 20, 2026|Tuesday.*20/);

  it('only dates with tasks are tab stops; focusing one opens its bubbles; Escape closes them', async () => {
    const user = setup([mk({ title: 'Kbd task', dueDate: iso(9, 20) })]);
    await user.tab(); // Previous month
    await user.tab(); // Today
    await user.tab(); // Next month
    await user.tab(); // first (only) date with a task
    expect(opener()).toHaveFocus();
    expect(bubbles()).toHaveLength(1);
    await user.tab(); // into the bubble
    expect(screen.getByRole('link', { name: /Kbd task/ })).toHaveFocus();
    expect(bubbles()).toHaveLength(1); // moving focus onto the bubble keeps it open
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
    expect(opener()).toHaveFocus(); // focus returns to the date, bubbles stay closed
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
  });

  it('Escape also closes bubbles that were opened by hover', async () => {
    const user = setup([mk({ dueDate: iso(9, 20) })]);
    await user.hover(opener());
    expect(bubbles()).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
  });

  it('Enter on a focused date opens the bubbles', async () => {
    const user = setup([mk({ dueDate: iso(9, 20) })]);
    opener().focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(bubbles()).toHaveLength(1);
  });

  it('a tap opens the bubbles, tapping the date again or anywhere else closes them', async () => {
    const user = setup([mk({ dueDate: iso(9, 20) }), mk({ dueDate: iso(9, 22) })]);
    const tap = (el) => user.pointer([{ keys: '[TouchA>]', target: el }, { keys: '[/TouchA]' }]);
    await tap(opener());
    expect(bubbles()).toHaveLength(1);
    await tap(dateButton(/22 October 2026|October 22, 2026|Thursday.*22/)); // another date: switches
    expect(document.querySelectorAll('.cal__bubbles')).toHaveLength(1);
    await tap(document.body);                                               // elsewhere: closes
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
    await tap(opener());
    expect(bubbles()).toHaveLength(1);
    await tap(opener());                                                    // same date again: toggles closed
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
  });

  it('a mouse click outside closes bubbles that are open', async () => {
    const user = setup([mk({ dueDate: iso(9, 20) })]);
    await user.hover(opener());
    await user.pointer({ keys: '[MouseLeft]', target: document.body });
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
  });

  it('changing month closes open bubbles', async () => {
    const user = setup([mk({ dueDate: iso(9, 20) })]);
    await user.hover(opener());
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.queryByRole('list', { name: /Tasks due/ })).not.toBeInTheDocument();
  });
});
