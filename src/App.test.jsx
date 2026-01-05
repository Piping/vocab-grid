import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const dbState = vi.hoisted(() => ({ data: [] }));
const vocabDBMock = vi.hoisted(() => ({
  hasData: vi.fn(async () => true),
  bulkAddData: vi.fn(async () => {}),
  getAllData: vi.fn(async () => dbState.data),
}));

vi.mock('./idb', () => ({ default: vocabDBMock }));
vi.mock('./assets/vocab_gre.json', () => ({ default: [] }));

const makeWords = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `word${i + 1}`,
    definition: `def${i + 1}`,
  }));

beforeEach(() => {
  dbState.data = makeWords(12);
  vocabDBMock.hasData.mockClear();
  vocabDBMock.bulkAddData.mockClear();
  vocabDBMock.getAllData.mockClear();
});

describe('App UI logic', () => {
  it('loads words and paginates', async () => {
    render(<App />);

    expect(await screen.findByText('word1')).toBeInTheDocument();
    expect(screen.getByText('/ 3')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'j' });
    expect(await screen.findByText('word6')).toBeInTheDocument();
    expect(screen.queryByText('word1')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k' });
    expect(await screen.findByText('word1')).toBeInTheDocument();
  });

  it('toggles remembered state on click', async () => {
    const user = userEvent.setup();
    render(<App />);

    const word = await screen.findByText('word1');
    const card = word.closest('.word-card');
    expect(card).toBeTruthy();

    await user.click(card);
    expect(card).toHaveClass('remembered');
    expect(within(card).getByText('✓')).toBeInTheDocument();

    await user.click(card);
    expect(card).not.toHaveClass('remembered');
    expect(within(card).queryByText('✓')).not.toBeInTheDocument();
  });

  it('shows definition on right click (context menu)', async () => {
    render(<App />);

    const word = await screen.findByText('word1');
    const card = word.closest('.word-card');
    expect(card).toBeTruthy();

    expect(within(card).queryByText('def1')).not.toBeInTheDocument();
    fireEvent.contextMenu(card);
    expect(within(card).getByText('def1')).toBeInTheDocument();
  });

  it('keyboard shortcuts: i toggles remembered for current page; o toggles showing definitions', async () => {
    render(<App />);
    const word1 = await screen.findByText('word1');
    const card1 = word1.closest('.word-card');
    expect(card1).toBeTruthy();

    expect(card1).toHaveAttribute('title', 'def1');
    fireEvent.keyDown(window, { key: 'o' });
    await waitFor(() => {
      expect(within(card1).getByText('def1')).toBeInTheDocument();
      expect(card1).not.toHaveAttribute('title');
    });

    fireEvent.keyDown(window, { key: 'i' });
    await waitFor(() => {
      expect(screen.getAllByText('✓')).toHaveLength(5);
    });

    fireEvent.keyDown(window, { key: 'i' });
    await waitFor(() => {
      expect(screen.queryAllByText('✓')).toHaveLength(0);
    });
  });

  it('keyboard shortcut: u plays the most recently interacted word', async () => {
    const user = userEvent.setup();
    render(<App />);

    const word = await screen.findByText('word3');
    const card = word.closest('.word-card');
    expect(card).toBeTruthy();

    await user.click(card);
    fireEvent.keyDown(window, { key: 'u' });

    await waitFor(() => {
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });
    const utter = window.speechSynthesis.speak.mock.calls.at(-1)?.[0];
    expect(utter?.text).toBe('word3');
  });
});
