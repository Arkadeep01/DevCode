import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../../components/Toast/ToastProvider';
import { StudyPage } from './StudyPage';

afterEach(cleanup);

function renderStudy(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/study" element={<StudyPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('StudyPage deep links', () => {
  it('opens the topic referenced by the ?topic query parameter', async () => {
    renderStudy('/study?topic=dsa-sliding-window');

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Two Pointers & Sliding Window Pattern');
  });

  it('ignores an unknown topic id and does not open a dialog', async () => {
    renderStudy('/study?topic=not-a-real-topic');

    await waitFor(() => expect(screen.getByText('Topics that pay off.')).toBeTruthy());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the topic list when no topic is requested', async () => {
    renderStudy('/study');

    await waitFor(() => expect(screen.getByText('Topics that pay off.')).toBeTruthy());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
