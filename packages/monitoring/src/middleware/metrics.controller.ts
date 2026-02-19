import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from '../metrics';

/**
 * Metrics endpoint for Prometheus scraping
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metrics.getMetrics();
    res.send(metrics);
  }
}
