import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BottomMobileNav from '../BottomMobileNav';
import { useStore } from '@/lib/store';

describe('BottomMobileNav', () => {
  it('should switch dashboard tabs from the mobile nav', () => {
    useStore.setState({ activeTab: 'chart' });
    render(<BottomMobileNav />);

    fireEvent.click(screen.getByRole('button', { name: 'Journal' }));

    expect(useStore.getState().activeTab).toBe('journal');
    expect(screen.getByRole('button', { name: 'Journal' })).toHaveAttribute('aria-current', 'page');
  });
});
