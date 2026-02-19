import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

/**
 * Health check controller for Kubernetes liveness and readiness probes
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness probe endpoint
   * Returns 200 if the application is running
   * Used by Kubernetes to restart unhealthy pods
   */
  @Get('live')
  async liveness(@Res() res: Response): Promise<void> {
    const result = await this.healthService.liveness();
    res.status(HttpStatus.OK).json(result);
  }

  /**
   * Readiness probe endpoint
   * Returns 200 if the application can serve traffic
   * Returns 503 if dependencies are unhealthy
   * Used by Kubernetes to route traffic
   */
  @Get('ready')
  async readiness(@Res() res: Response): Promise<void> {
    const result = await this.healthService.readiness();

    const statusCode =
      result.status === 'healthy'
        ? HttpStatus.OK
        : result.status === 'degraded'
          ? HttpStatus.OK // Still serve traffic but with degraded performance
          : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(result);
  }

  /**
   * Combined health check endpoint
   * Returns both liveness and readiness status
   */
  @Get()
  async health(@Res() res: Response): Promise<void> {
    const [livenessResult, readinessResult] = await Promise.all([
      this.healthService.liveness(),
      this.healthService.readiness(),
    ]);

    const statusCode =
      readinessResult.status === 'healthy'
        ? HttpStatus.OK
        : readinessResult.status === 'degraded'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      liveness: livenessResult,
      readiness: readinessResult,
    });
  }
}
