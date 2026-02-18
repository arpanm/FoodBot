import React from 'react';

export interface Stage {
  name: string;
  completed: boolean;
  completedAt?: Date;
}

export interface ProgressStepperProps {
  stages: Stage[];
  currentStage?: string;
  'data-testid'?: string;
}

/**
 * Progress stepper component for multi-step workflows
 */
export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  stages,
  currentStage,
  'data-testid': testId,
}) => {
  return (
    <div className="progress-stepper" data-testid={testId || 'progress-stepper'}>
      {stages.map((stage, index) => {
        const isCurrent = stage.name === currentStage;
        const isCompleted = stage.completed;

        return (
          <div
            key={stage.name}
            className={`step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            data-testid={`step-${stage.name}`}
          >
            <div className="step-indicator">
              <div
                className={`step-circle ${isCompleted ? 'step-completed' : ''} ${isCurrent ? 'step-active' : ''}`}
                data-testid={`step-circle-${stage.name}`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              {index < stages.length - 1 && (
                <div
                  className={`step-line ${isCompleted ? 'line-completed' : ''}`}
                  data-testid={`step-line-${stage.name}`}
                />
              )}
            </div>
            <div className="step-content">
              <span
                className="step-label"
                data-testid={`step-label-${stage.name}`}
              >
                {stage.name.replace(/_/g, ' ')}
              </span>
              {stage.completedAt && (
                <span
                  className="step-time"
                  data-testid={`step-time-${stage.name}`}
                >
                  {new Date(stage.completedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
