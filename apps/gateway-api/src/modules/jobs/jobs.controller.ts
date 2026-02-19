import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { SaveJobDataDto } from './dto/save-job-data.dto';
import { JobResponseDto, JobListResponseDto } from './dto/job-response.dto';

interface UserPayload {
  userId: string;
  email: string;
}

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async createJob(
    @CurrentUser() user: UserPayload,
    @Body() createJobDto: CreateJobDto
  ): Promise<JobResponseDto> {
    return this.jobsService.createJob(user.userId, createJobDto);
  }

  @Get('pending')
  async getPendingJobs(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ): Promise<JobListResponseDto> {
    const jobs = await this.jobsService.findPendingJobs(limit);
    return {
      jobs,
      total: jobs.length,
    };
  }

  @Get('my-jobs')
  async getMyJobs(
    @CurrentUser() user: UserPayload,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ): Promise<JobListResponseDto> {
    const jobs = await this.jobsService.findByUserId(user.userId, limit);
    return {
      jobs,
      total: jobs.length,
    };
  }

  @Get(':jobId')
  async getJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: UserPayload
  ): Promise<JobResponseDto> {
    return this.jobsService.findById(jobId, user.userId);
  }

  @Patch(':jobId/status')
  async updateJobStatus(
    @Param('jobId') jobId: string,
    @Body() updateStatusDto: UpdateJobStatusDto
  ): Promise<JobResponseDto> {
    return this.jobsService.updateStatus(jobId, updateStatusDto);
  }

  @Post(':jobId/data')
  async saveJobData(
    @Param('jobId') jobId: string,
    @Body() saveJobDataDto: SaveJobDataDto
  ): Promise<JobResponseDto> {
    return this.jobsService.updateResult(jobId, saveJobDataDto);
  }

  @Delete(':jobId')
  async cancelJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: UserPayload
  ): Promise<JobResponseDto> {
    return this.jobsService.cancelJob(jobId, user.userId);
  }
}
