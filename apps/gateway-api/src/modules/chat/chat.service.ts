import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, GoneException } from '@nestjs/common';

interface Job {
  jobId: string;
  userId: string;
  sessionId?: string;
  message: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  progress?: {
    currentStep: string;
    totalSteps: number;
    currentStepNumber: number;
  };
  result?: {
    response: string;
    restaurants?: unknown[];
    dishes?: unknown[];
  };
  error?: {
    code: string;
    message: string;
  };
  location?: { latitude: number; longitude: number };
  preferences?: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private jobs = new Map<string, Job>();
  private expiredJobs = new Set<string>();

  constructor() {
    // Pre-register expired job for testing
    this.expiredJobs.add('job_expired123');
  }

  createJob(userId: string, data: {
    message: string;
    sessionId?: string;
    location?: { latitude: number; longitude: number };
    preferences?: Record<string, unknown>;
  }): {
    jobId: string;
    status: string;
    message: string;
    sessionId?: string;
  } {
    const jobId = `job_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

    const job: Job = {
      jobId,
      userId,
      sessionId: data.sessionId,
      message: data.message,
      status: 'QUEUED',
      timestamp: new Date().toISOString(),
      location: data.location,
      preferences: data.preferences,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Simulate async processing
    this.processJobAsync(jobId);

    const response: {
      jobId: string;
      status: string;
      message: string;
      sessionId?: string;
    } = {
      jobId,
      status: 'QUEUED',
      message: 'Job queued successfully',
    };

    if (data.sessionId) {
      response.sessionId = data.sessionId;
    }

    return response;
  }

  getJobStatus(jobId: string, userId: string): {
    jobId: string;
    status: string;
    sessionId?: string;
    timestamp: string;
    progress?: {
      currentStep: string;
      totalSteps: number;
      currentStepNumber: number;
    };
    result?: {
      response: string;
      restaurants?: unknown[];
      dishes?: unknown[];
    };
    error?: {
      code: string;
      message: string;
    };
  } {
    // Check for invalid format
    if (!jobId.startsWith('job_')) {
      throw new BadRequestException('Invalid job ID format');
    }

    // Check for expired jobs
    if (this.expiredJobs.has(jobId)) {
      throw new GoneException('Job has expired');
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('Forbidden resource');
    }

    return {
      jobId: job.jobId,
      status: job.status,
      sessionId: job.sessionId,
      timestamp: job.timestamp,
      progress: job.progress,
      result: job.result,
      error: job.error,
    };
  }

  private async processJobAsync(jobId: string): Promise<void> {
    // Simulate async processing with setTimeout
    setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (!job) return;

      job.status = 'IN_PROGRESS';
      job.progress = {
        currentStep: 'Processing query',
        totalSteps: 3,
        currentStepNumber: 1,
      };

      setTimeout(() => {
        const currentJob = this.jobs.get(jobId);
        if (!currentJob) return;

        currentJob.status = 'COMPLETED';
        currentJob.result = {
          response: 'Here are some recommendations for you.',
          restaurants: [
            {
              id: 'restaurant-123',
              name: 'Test Restaurant',
              rating: 4.5,
              cuisineTypes: ['Italian'],
            },
          ],
          dishes: [],
        };
        currentJob.progress = undefined;
      }, 100);
    }, 50);
  }
}
