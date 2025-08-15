/** @jest-environment jsdom */

import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import KpiCard from '@/components/KpiCard';

describe('KpiCard accessibility', () => {
  it('has no detectable a11y violations', async () => {
    const { container } = render(<KpiCard label="Sharpe" value="1.23" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});