import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentJob, JobStatus } from '../../entities/agent-job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { SaveJobDataDto } from './dto/save-job-data.dto';
import { JobResponseDto } from './dto/job-response.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(AgentJob)
    private readonly jobRepository: Repository<AgentJob>
  ) {}

  async createJob(
    userId: string,
    createJobDto: CreateJobDto
  ): Promise<JobResponseDto> {
    const job = this.jobRepository.create({
      userId,
      action: createJobDto.action,
      platform: createJobDto.platform,
      payload: createJobDto.payload,
      status: JobStatus.PENDING,
      progress: 0,
    });

    const savedJob = await this.jobRepository.save(job);
    return this.mapToResponseDto(savedJob);
  }

  async findPendingJobs(limit: number = 10): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.find({
      where: { status: JobStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return jobs.map((job) => this.mapToResponseDto(job));
  }

  async findById(jobId: string, userId?: string): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // If userId is provided, verify ownership
    if (userId && job.userId !== userId) {
      throw new ForbiddenException('You do not have access to this job');
    }

    return this.mapToResponseDto(job);
  }

  async updateStatus(
    jobId: string,
    updateStatusDto: UpdateJobStatusDto
  ): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Validate status transitions
    this.validateStatusTransition(job.status, updateStatusDto.status);

    // Update job fields
    job.status = updateStatusDto.status;

    if (updateStatusDto.currentStep !== undefined) {
      job.currentStep = updateStatusDto.currentStep;
    }

    if (updateStatusDto.progress !== undefined) {
      job.progress = updateStatusDto.progress;
    }

    if (updateStatusDto.errorMessage !== undefined) {
      job.errorMessage = updateStatusDto.errorMessage;
    }

    // Set completedAt for terminal states
    if (
      updateStatusDto.status === JobStatus.COMPLETED ||
      updateStatusDto.status === JobStatus.FAILED ||
      updateStatusDto.status === JobStatus.CANCELLED
    ) {
      job.completedAt = new Date();
    }

    const updatedJob = await this.jobRepository.save(job);
    return this.mapToResponseDto(updatedJob);
  }

  async updateResult(
    jobId: string,
    saveJobDataDto: SaveJobDataDto
  ): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    job.result = saveJobDataDto.result;

    const updatedJob = await this.jobRepository.save(job);
    return this.mapToResponseDto(updatedJob);
  }

  async cancelJob(jobId: string, userId: string): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('You do not have access to this job');
    }

    // Only allow cancellation of jobs that are not already in terminal states
    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.FAILED ||
      job.status === JobStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel job in ${job.status} status`
      );
    }

    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();

    const cancelledJob = await this.jobRepository.save(job);
    return this.mapToResponseDto(cancelledJob);
  }

  async findByUserId(
    userId: string,
    limit: number = 50
  ): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return jobs.map((job) => this.mapToResponseDto(job));
  }

  private validateStatusTransition(
    currentStatus: JobStatus,
    newStatus: JobStatus
  ): void {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.PENDING]: [
        JobStatus.IN_PROGRESS,
        JobStatus.CANCELLED,
        JobStatus.FAILED,
      ],
      [JobStatus.IN_PROGRESS]: [
        JobStatus.AWAITING_USER_ACTION,
        JobStatus.COMPLETED,
        JobStatus.FAILED,
        JobStatus.CANCELLED,
      ],
      [JobStatus.AWAITING_USER_ACTION]: [
        JobStatus.IN_PROGRESS,
        JobStatus.COMPLETED,
        JobStatus.FAILED,
        JobStatus.CANCELLED,
      ],
      [JobStatus.COMPLETED]: [],
      [JobStatus.FAILED]: [],
      [JobStatus.CANCELLED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private mapToResponseDto(job: AgentJob): JobResponseDto {
    return {
      id: job.id,
      userId: job.userId,
      status: job.status,
      action: job.action,
      platform: job.platform,
      payload: job.payload,
      result: job.result,
      currentStep: job.currentStep,
      progress: job.progress,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }
}
