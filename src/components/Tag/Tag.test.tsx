import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tag } from './Tag';

describe('Tag', () => {
  it('renders its content with the variant class', () => {
    render(<Tag variant="success">Beginner</Tag>);

    const tag = screen.getByText('Beginner');
    expect(tag.classList.contains('tag')).toBe(true);
    expect(tag.classList.contains('tag--success')).toBe(true);
  });
});
