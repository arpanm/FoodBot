import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Stage } from '../ProgressStepper';
import { ProgressStepper } from '../ProgressStepper';

/**
 * ProgressStepper Component Tests
 */

function createStages(): Stage[] {
  return [
    { name: 'confirmed', completed: true, completedAt: new Date('2024-01-15T12:05:00Z') },
    { name: 'preparing', completed: true, completedAt: new Date('2024-01-15T12:15:00Z') },
    { name: 'out_for_delivery', completed: false },
    { name: 'delivered', completed: false },
  ];
}

describe('ProgressStepper Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('progress-stepper')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<ProgressStepper stages={createStages()} data-testid="my-stepper" />);
      expect(screen.getByTestId('my-stepper')).toBeInTheDocument();
    });

    it('renders all stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-confirmed')).toBeInTheDocument();
      expect(screen.getByTestId('step-preparing')).toBeInTheDocument();
      expect(screen.getByTestId('step-out_for_delivery')).toBeInTheDocument();
      expect(screen.getByTestId('step-delivered')).toBeInTheDocument();
    });

    it('displays stage labels with underscores replaced by spaces', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-label-out_for_delivery')).toHaveTextContent('out for delivery');
    });
  });

  describe('Completed Stages', () => {
    it('applies completed class to completed stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-confirmed')).toHaveClass('completed');
      expect(screen.getByTestId('step-preparing')).toHaveClass('completed');
    });

    it('does not apply completed class to incomplete stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-out_for_delivery')).not.toHaveClass('completed');
      expect(screen.getByTestId('step-delivered')).not.toHaveClass('completed');
    });

    it('shows checkmark for completed stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-circle-confirmed')).toHaveClass('step-completed');
    });

    it('shows step number for incomplete stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-circle-delivered')).toHaveTextContent('4');
    });
  });

  describe('Current Stage', () => {
    it('applies current class to current stage', () => {
      render(<ProgressStepper stages={createStages()} currentStage="out_for_delivery" />);
      expect(screen.getByTestId('step-out_for_delivery')).toHaveClass('current');
    });

    it('applies step-active class to current stage circle', () => {
      render(<ProgressStepper stages={createStages()} currentStage="out_for_delivery" />);
      expect(screen.getByTestId('step-circle-out_for_delivery')).toHaveClass('step-active');
    });

    it('does not apply current class to non-current stages', () => {
      render(<ProgressStepper stages={createStages()} currentStage="preparing" />);
      expect(screen.getByTestId('step-confirmed')).not.toHaveClass('current');
      expect(screen.getByTestId('step-delivered')).not.toHaveClass('current');
    });
  });

  describe('Step Lines', () => {
    it('renders connecting lines between stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-line-confirmed')).toBeInTheDocument();
      expect(screen.getByTestId('step-line-preparing')).toBeInTheDocument();
      expect(screen.getByTestId('step-line-out_for_delivery')).toBeInTheDocument();
    });

    it('does not render line after last stage', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.queryByTestId('step-line-delivered')).not.toBeInTheDocument();
    });

    it('applies line-completed class for completed stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-line-confirmed')).toHaveClass('line-completed');
      expect(screen.getByTestId('step-line-preparing')).toHaveClass('line-completed');
    });

    it('does not apply line-completed class for incomplete stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-line-out_for_delivery')).not.toHaveClass('line-completed');
    });
  });

  describe('Completed Timestamps', () => {
    it('displays completion time for completed stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.getByTestId('step-time-confirmed')).toBeInTheDocument();
      expect(screen.getByTestId('step-time-preparing')).toBeInTheDocument();
    });

    it('does not display time for incomplete stages', () => {
      render(<ProgressStepper stages={createStages()} />);
      expect(screen.queryByTestId('step-time-out_for_delivery')).not.toBeInTheDocument();
      expect(screen.queryByTestId('step-time-delivered')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty stages array', () => {
      render(<ProgressStepper stages={[]} />);
      expect(screen.getByTestId('progress-stepper')).toBeInTheDocument();
    });

    it('renders single stage without line', () => {
      const stages: Stage[] = [{ name: 'pending', completed: false }];
      render(<ProgressStepper stages={stages} />);
      expect(screen.getByTestId('step-pending')).toBeInTheDocument();
      expect(screen.queryByTestId('step-line-pending')).not.toBeInTheDocument();
    });
  });
});
