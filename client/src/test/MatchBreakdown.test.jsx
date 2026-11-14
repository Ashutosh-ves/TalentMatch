import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchBreakdown } from '../components/common/MatchBreakdown';

describe('MatchBreakdown', () => {
  it('renders all three breakdown rows with their scores when fully applicable', () => {
    const breakdown = {
      skills: {
        score: 75,
        matched: ['React', 'JavaScript'],
        missing: ['Docker'],
        applicable: true,
      },
      github: {
        score: 100,
        matched: ['JavaScript'],
        applicable: true,
      },
      availability: {
        score: 100,
        studentValue: 'Internship',
        openingValue: 'Internship',
        applicable: true,
      },
    };

    render(<MatchBreakdown breakdown={breakdown} />);

    // Verify row headers
    expect(screen.getByText('Skills (60%)')).toBeInTheDocument();
    expect(screen.getByText('GitHub languages (25%)')).toBeInTheDocument();
    expect(screen.getByText('Availability (15%)')).toBeInTheDocument();

    // Verify scores
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('100%')).toHaveLength(2);
  });

  it('renders "Not applicable" badge for non-applicable components', () => {
    const breakdown = {
      skills: {
        score: 60,
        matched: ['Python'],
        applicable: true,
      },
      github: {
        applicable: false,
      },
      availability: {
        applicable: false,
      },
    };

    render(<MatchBreakdown breakdown={breakdown} />);

    // Skills should show score
    expect(screen.getByText('Skills (60%)')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();

    // GitHub and Availability should show "Not applicable"
    const notApplicableBadges = screen.getAllByText('Not applicable');
    expect(notApplicableBadges).toHaveLength(2);
  });
});
