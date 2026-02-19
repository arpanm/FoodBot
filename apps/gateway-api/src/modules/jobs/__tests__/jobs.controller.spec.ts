import { Test, TestingModule } from '@nestjs/testing';
import { JobsController } from '../jobs.controller';
import { JobsService } from '../jobs.service';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobStatusDto } from '../dto/update-job-status.dto';
import { SaveJobDataDto } from '../dto/save-job-data.dto';
import { JobAction, JobStatus } from '../../../entities/agent-job.entity';

describe('JobsController', () => {
  let controller: JobsController;
  let service: JobsService;

  const mockJobsService = {
    createJob: jest.fn(),
    findPendingJobs: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    updateResult: jest.fn(),
    cancelJob: jest.fn(),
    findByUserId: jest.fn(),
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    controller = module.get<JobsController>(JobsController);
    service = module.get<JobsService>(JobsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job', async () => {
      const createJobDto: CreateJobDto = {
        action: JobAction.SEARCH_RESTAURANT,
        platform: 'swiggy',
        payload: { query: 'pizza' },
      };

      const expectedJob = {
        id: 'job-123',
        userId: mockUser.userId,
        status: JobStatus.PENDING,
        action: createJobDto.action,
        platform: createJobDto.platform,
        payload: createJobDto.payload,
        result: null,
        currentStep: null,
        progress: 0,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      mockJobsService.createJob.mockResolvedValue(expectedJob);

      const result = await controller.createJob(mockUser, createJobDto);

      expect(result).toEqual(expectedJob);
      expect(service.createJob).toHaveBeenCalledWith(
        mockUser.userId,
        createJobDto
      );
    });
  });

  describe('getPendingJobs', () => {
    it('should return pending jobs', async () => {
      const pendingJobs = [
        {
          id: 'job-1',
          userId: 'user-1',
          status: JobStatus.PENDING,
          action: JobAction.SEARCH_RESTAURANT,
          platform: 'swiggy',
          payload: {},
          result: null,
          currentStep: null,
          progress: 0,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
        },
      ];

      mockJobsService.findPendingJobs.mockResolvedValue(pendingJobs);

      const result = await controller.getPendingJobs(10);

      expect(result).toEqual({
        jobs: pendingJobs,
        total: pendingJobs.length,
      });
      expect(service.findPendingJobs).toHaveBeenCalledWith(10);
    });
  });

  describe('getJob', () => {
    it('should return a specific job', async () => {
      const jobId = 'job-123';
      const expectedJob = {
        id: jobId,
        userId: mockUser.userId,
        status: JobStatus.IN_PROGRESS,
        action: JobAction.ADD_TO_CART,
        platform: 'zomato',
        payload: {},
        result: null,
        currentStep: 'Adding items',
        progress: 50,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      mockJobsService.findById.mockResolvedValue(expectedJob);

      const result = await controller.getJob(jobId, mockUser);

      expect(result).toEqual(expectedJob);
      expect(service.findById).toHaveBeenCalledWith(jobId, mockUser.userId);
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status', async () => {
      const jobId = 'job-123';
      const updateDto: UpdateJobStatusDto = {
        status: JobStatus.COMPLETED,
        progress: 100,
      };

      const updatedJob = {
        id: jobId,
        userId: mockUser.userId,
        status: JobStatus.COMPLETED,
        action: JobAction.CHECKOUT,
        platform: 'swiggy',
        payload: {},
        result: null,
        currentStep: null,
        progress: 100,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockJobsService.updateStatus.mockResolvedValue(updatedJob);

      const result = await controller.updateJobStatus(jobId, updateDto);

      expect(result).toEqual(updatedJob);
      expect(service.updateStatus).toHaveBeenCalledWith(jobId, updateDto);
    });
  });

  describe('saveJobData', () => {
    it('should save job result data', async () => {
      const jobId = 'job-123';
      const saveDataDto: SaveJobDataDto = {
        result: { orderId: 'order-456' },
      };

      const updatedJob = {
        id: jobId,
        userId: mockUser.userId,
        status: JobStatus.COMPLETED,
        action: JobAction.CHECKOUT,
        platform: 'swiggy',
        payload: {},
        result: saveDataDto.result,
        currentStep: null,
        progress: 100,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockJobsService.updateResult.mockResolvedValue(updatedJob);

      const result = await controller.saveJobData(jobId, saveDataDto);

      expect(result).toEqual(updatedJob);
      expect(service.updateResult).toHaveBeenCalledWith(jobId, saveDataDto);
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job', async () => {
      const jobId = 'job-123';
      const cancelledJob = {
        id: jobId,
        userId: mockUser.userId,
        status: JobStatus.CANCELLED,
        action: JobAction.TRACK_ORDER,
        platform: 'zomato',
        payload: {},
        result: null,
        currentStep: null,
        progress: 0,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockJobsService.cancelJob.mockResolvedValue(cancelledJob);

      const result = await controller.cancelJob(jobId, mockUser);

      expect(result).toEqual(cancelledJob);
      expect(service.cancelJob).toHaveBeenCalledWith(jobId, mockUser.userId);
    });
  });

  describe('getMyJobs', () => {
    it('should return user jobs', async () => {
      const userJobs = [
        {
          id: 'job-1',
          userId: mockUser.userId,
          status: JobStatus.COMPLETED,
          action: JobAction.SEARCH_RESTAURANT,
          platform: 'swiggy',
          payload: {},
          result: {},
          currentStep: null,
          progress: 100,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
        },
      ];

      mockJobsService.findByUserId.mockResolvedValue(userJobs);

      const result = await controller.getMyJobs(mockUser, 50);

      expect(result).toEqual({
        jobs: userJobs,
        total: userJobs.length,
      });
      expect(service.findByUserId).toHaveBeenCalledWith(mockUser.userId, 50);
    });
  });
});
