import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

beforeEach(() => localStorage.clear());

function startWorksheet() {
  const { container } = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /בואו נתחיל/ }));
  fireEvent.click(screen.getByRole('button', { name: /התחילו לתרגל/ }));
  return container;
}

describe('NUMO app', () => {
  it('renders the Hebrew welcome screen and starts a worksheet', () => {
    const container = startWorksheet();
    expect(screen.getByRole('heading', { name: 'פותרים תרגילים' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(25);
    expect(container.querySelector('.equation')).toHaveTextContent(/[+−×÷]/);
  });

  it('shows review feedback and leaves incorrect answers editable', () => {
    const container = startWorksheet();
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '999999' } });
    expect(screen.getByText(/ענית על 1 מתוך 25 תרגילים/)).toBeInTheDocument();
    fireEvent.click(container.querySelector('.submit')!);
    expect(screen.getByRole('heading', { name: 'בדיקת תשובות' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /סיום והצגת ציון/ })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-invalid', 'true');
  });
});
