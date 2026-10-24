import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

beforeEach(() => localStorage.clear());

describe('partial worksheet completion', () => {
  it('does not show a score when no answers were entered', () => {
    const { container } = render(<App />);
    fireEvent.click(container.querySelector('.welcome-actions .primary')!);
    fireEvent.click(container.querySelector('.welcome-card .primary')!);

    fireEvent.click(container.querySelector('.submit')!);

    expect(container.querySelector('.checking-screen')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('יש לענות על תרגיל אחד לפחות לפני הצגת הציון.');
    expect(screen.getByRole('heading', { name: 'פותרים תרגילים' })).toBeInTheDocument();
  });

  it('shows the calculated score after reviewing incorrect answers', () => {
    const { container } = render(<App />);
    fireEvent.click(container.querySelector('.welcome-actions .primary')!);
    fireEvent.click(container.querySelector('.welcome-card .primary')!);
    screen.getAllByRole('textbox').forEach((input) => {
      fireEvent.change(input, { target: { value: '999999' } });
    });

    fireEvent.click(container.querySelector('.submit')!);
    expect(container.querySelector('.checking-screen')).toBeInTheDocument();
    fireEvent.click(container.querySelector('.submit')!);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('ענית נכון על 0 מתוך 25 תרגילים.')).toBeInTheDocument();
  });
});
