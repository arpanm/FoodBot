import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

import { BulkOrderService } from './bulk-order.service';
import { AddBulkItemDto } from './dto/add-bulk-item.dto';
import {
  BulkOrderResponse,
  PricingBreakdownResponse,
} from './dto/bulk-order-response.dto';
import { CreateBulkOrderDto } from './dto/create-bulk-order.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('bulk-orders')
@UseGuards(JwtAuthGuard)
export class BulkOrderController {
  constructor(
    private readonly bulkOrderService: BulkOrderService,
  ) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateBulkOrderDto
  ): Promise<BulkOrderResponse> {
    return this.bulkOrderService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest
  ): Promise<BulkOrderResponse[]> {
    return this.bulkOrderService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<BulkOrderResponse> {
    return this.bulkOrderService.findById(id, req.user.userId);
  }

  @Post(':id/items')
  async addItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AddBulkItemDto
  ): Promise<BulkOrderResponse> {
    return this.bulkOrderService.addItem(id, req.user.userId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string
  ): Promise<BulkOrderResponse> {
    return this.bulkOrderService.removeItem(id, req.user.userId, itemId);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<BulkOrderResponse> {
    return this.bulkOrderService.confirmOrder(id, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<BulkOrderResponse> {
    return this.bulkOrderService.cancelOrder(id, req.user.userId);
  }

  @Get(':id/pricing')
  async getPricingBreakdown(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<PricingBreakdownResponse> {
    return this.bulkOrderService.getPricingBreakdown(id, req.user.userId);
  }
}
