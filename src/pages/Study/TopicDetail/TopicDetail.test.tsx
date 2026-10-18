import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { STUDY_TOPICS } from '../../../data/studyTopics';
import { TopicDetail } from './TopicDetail';

afterEach(cleanup);

const TOPIC = STUDY_TOPICS[0];

function Harness() {
  const [open, setOpen] = useState(false);
  const [mastered, setMastered] = useState(false);

  return (
    <div>
      <p data-testid="page-background">Page background</p>
      <button type="button" onClick={() => setOpen(true)}>
        Read topic
      </button>
      {open ? (
        <TopicDetail
          topic={TOPIC}
          mastered={mastered}
          bookmarked={false}
          onToggleMastered={() => setMastered((value) => !value)}
          onToggleBookmark={() => undefined}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function openDialog() {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Read topic' });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, panel: screen.getByRole('dialog') };
}

describe('TopicDetail focus behavior', () => {
  it('focuses the close button when it opens', () => {
    openDialog();

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close topic' })
    );
  });

  it('does not steal focus back to the close button when the parent re-renders', () => {
    openDialog();

    const masteredButton = screen.getByRole('button', { name: 'Mark mastered' });
    masteredButton.focus();
    fireEvent.click(masteredButton);

    expect(masteredButton.textContent).toBe('Mastered');
    expect(document.activeElement).toBe(masteredButton);
  });

  it('wraps Tab from the last focusable element back to the first', () => {
    const { panel } = openDialog();

    const closeButton = screen.getByRole('button', { name: 'Close topic' });
    const copyButton = screen.getByRole('button', { name: 'Copy' });
    copyButton.focus();

    fireEvent.keyDown(copyButton, { key: 'Tab' });

    expect(panel.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(closeButton);
  });

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    const { panel } = openDialog();

    const closeButton = screen.getByRole('button', { name: 'Close topic' });
    const copyButton = screen.getByRole('button', { name: 'Copy' });
    closeButton.focus();

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });

    expect(panel.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(copyButton);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const { trigger } = openDialog();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('makes the page background inert while open and restores it on close', () => {
    openDialog();

    const background = screen.getByTestId('page-background');
    expect(background.hasAttribute('inert')).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(background.hasAttribute('inert')).toBe(false);
  });
});
