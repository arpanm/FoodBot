import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  createChat(@Req() req: AuthenticatedRequest, @Body() dto: ChatMessageDto) {
    // Check if userId matches authenticated user
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('Forbidden resource');
    }

    return this.chatService.createJob(dto.userId, {
      message: dto.message,
      sessionId: dto.sessionId,
      location: dto.location,
      preferences: dto.preferences,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs/:jobId/status')
  getJobStatus(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.chatService.getJobStatus(jobId, req.user.userId);
  }
}
