import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CopyrightNotice from '@/components/CopyrightNotice';
import { AMP_NOTICE, NKJV_NOTICE } from '../../supabase/functions/_shared/bible-core';

describe('CopyrightNotice', () => {
  it('renders the exact AMP notice with www.Lockman.org as a link', () => {
    render(<CopyrightNotice notice={AMP_NOTICE} />);
    const el = screen.getByTestId('copyright-notice');
    expect(el.textContent).toBe(AMP_NOTICE);
    const link = screen.getByRole('link', { name: 'www.Lockman.org' });
    expect(link.getAttribute('href')).toBe('https://www.lockman.org');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
  it('renders the exact NKJV notice with no link', () => {
    render(<CopyrightNotice notice={NKJV_NOTICE} />);
    expect(screen.getByTestId('copyright-notice').textContent).toBe(NKJV_NOTICE);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
