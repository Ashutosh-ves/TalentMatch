import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OpeningCandidates } from '../pages/recruiter/OpeningCandidates';
import { openingService } from '../services/openingService';

vi.mock('../services/openingService', () => ({
  openingService: {
    getOpeningById: vi.fn(),
    getOpeningRankedCandidates: vi.fn(),
  },
}));

vi.mock('../services/applicationService', () => ({
  applicationService: {
    shortlistApplication: vi.fn(),
    rejectApplication: vi.fn(),
  },
}));

describe('OpeningCandidates skill chips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/recruiter/openings/opening-1/candidates']}>
          <Routes>
            <Route path="/recruiter/openings/:id/candidates" element={<OpeningCandidates />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders candidate own skills with matched required skills highlighted and keeps skill filter working', async () => {
    openingService.getOpeningById.mockResolvedValue({
      opening: {
        _id: 'opening-1',
        title: 'Frontend Developer Intern',
        companyName: 'Nexus Tech Global',
        requiredSkills: ['React', 'JavaScript', 'Tailwind CSS'],
      },
    });

    openingService.getOpeningRankedCandidates.mockResolvedValue({
      candidates: [
        {
          _id: 'app-1',
          status: 'shortlisted',
          matchScore: 85,
          appliedAt: '2026-10-01T00:00:00.000Z',
          studentId: {
            _id: 'stu-1',
            name: 'Ashutosh M',
            email: 'ashutosh.m@talentmatch.com',
          },
          studentSkills: ['React', 'Django', 'javascript'],
        },
        {
          _id: 'app-2',
          status: 'applied',
          matchScore: 40,
          appliedAt: '2026-10-02T00:00:00.000Z',
          studentId: {
            _id: 'stu-2',
            name: 'Swayam M',
            email: 'swayam.m@talentmatch.com',
          },
          studentSkills: ['Python', 'C++'],
        },
      ],
    });

    renderPage();

    const firstHeading = await screen.findByText('Ashutosh M');
    const firstCard = firstHeading.closest('article');
    expect(firstCard).not.toBeNull();

    // Candidate 1 shows own skills (React, Django, javascript), NOT missing required skill Tailwind CSS
    const reactChip = within(firstCard).getByText('React');
    const jsChip = within(firstCard).getByText('javascript');
    const djangoChip = within(firstCard).getByText('Django');

    expect(reactChip.className).toContain('border-match-indicator');
    expect(jsChip.className).toContain('border-match-indicator');
    expect(djangoChip.className).toContain('border-border-hairline');
    expect(djangoChip.className).not.toContain('border-match-indicator');
    expect(within(firstCard).queryByText('Tailwind CSS')).not.toBeInTheDocument();

    // Candidate 2 shows own skills (Python, C++) neutrally and not React
    const secondCard = screen.getByText('Swayam M').closest('article');
    expect(within(secondCard).getByText('Python').className).toContain('border-border-hairline');
    expect(within(secondCard).getByText('C++').className).toContain('border-border-hairline');
    expect(within(secondCard).queryByText('React')).not.toBeInTheDocument();

    // Existing skill filter still filters candidates by required skill
    const reactFilterBtn = screen.getByRole('button', { name: 'React' });
    fireEvent.click(reactFilterBtn);

    expect(screen.getByText('Ashutosh M')).toBeInTheDocument();
    expect(screen.queryByText('Swayam M')).not.toBeInTheDocument();
  });
});
