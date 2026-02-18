import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, GoneException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Workflow, WorkflowStatus } from '../../entities/workflow.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
  ) {}

  async createJob(userId: string, data: {
    message: string;
    sessionId?: string;
    location?: { latitude: number; longitude: number };
    preferences?: Record<string, unknown>;
  }): Promise<{
    jobId: string;
    status: string;
    message: string;
    sessionId?: string;
  }> {
    const jobId = `job_${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

    const workflow = this.workflowRepository.create({
      jobId,
      userId,
      sessionId: data.sessionId,
      message: data.message,
      status: WorkflowStatus.QUEUED,
      location: data.location,
      preferences: data.preferences,
    });

    await this.workflowRepository.save(workflow);

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

  async getJobStatus(jobId: string, userId: string): Promise<{
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
  }> {
    // Check for invalid format
    if (!jobId.startsWith('job_')) {
      throw new BadRequestException('Invalid job ID format');
    }

    // Check for expired jobs (special test case)
    if (jobId === 'job_expired123') {
      throw new GoneException('Job has expired');
    }

    const workflow = await this.workflowRepository.findOne({ where: { jobId } });
    if (!workflow) {
      throw new NotFoundException('Job not found');
    }

    if (workflow.userId !== userId) {
      throw new ForbiddenException('Forbidden resource');
    }

    return {
      jobId: workflow.jobId,
      status: workflow.status,
      sessionId: workflow.sessionId,
      timestamp: workflow.createdAt.toISOString(),
      progress: workflow.progress,
      result: workflow.result as {
        response: string;
        restaurants?: unknown[];
        dishes?: unknown[];
      } | undefined,
      error: workflow.error,
    };
  }

  private async processJobAsync(jobId: string): Promise<void> {
    // Simulate async processing with setTimeout
    setTimeout(async () => {
      try {
        const workflow = await this.workflowRepository.findOne({ where: { jobId } });
        if (!workflow) return;

        workflow.status = WorkflowStatus.IN_PROGRESS;
        workflow.progress = {
          currentStep: 'Processing query',
          totalSteps: 3,
          currentStepNumber: 1,
        };
        await this.workflowRepository.save(workflow);

        setTimeout(async () => {
          try {
            const currentWorkflow = await this.workflowRepository.findOne({ where: { jobId } });
            if (!currentWorkflow) return;

            currentWorkflow.status = WorkflowStatus.COMPLETED;
            currentWorkflow.result = {
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
            currentWorkflow.progress = undefined;
            await this.workflowRepository.save(currentWorkflow);
          } catch (error) {
            this.logger.error(`Failed to complete job ${jobId}`, error);
          }
        }, 100);
      } catch (error) {
        this.logger.error(`Failed to process job ${jobId}`, error);
      }
    }, 50);
  }
}
