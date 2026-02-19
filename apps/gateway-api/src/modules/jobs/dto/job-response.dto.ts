import { JobStatus, JobAction } from '../../../entities/agent-job.entity';

export class JobResponseDto {
  id: string;
  userId: string;
  status: JobStatus;
  action: JobAction;
  platform: string;
  payload: Record<string, any>;
  result: Record<string, any> | null;
  currentStep: string | null;
  progress: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export class JobListResponseDto {
  jobs: JobResponseDto[];
  total: number;
}
