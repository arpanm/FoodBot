import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';


interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  submitFeedback(@Req() req: AuthenticatedRequest, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.submitFeedback(req.user.userId, {
      orderId: dto.orderId,
      rating: dto.rating,
      comment: dto.comment,
      foodQuality: dto.foodQuality,
      deliverySpeed: dto.deliverySpeed,
      packaging: dto.packaging,
    });
  }

  @Get(':orderId')
  getFeedback(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string) {
    return this.feedbackService.getFeedbackByOrder(orderId, req.user.userId);
  }
}
