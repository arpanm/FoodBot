import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, UpdateOrderStatusDto, CancelOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string; restaurantId?: string };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.orderService.create(req.user.userId, {
      restaurantId: dto.restaurantId,
      items: dto.items,
      deliveryAddress: dto.deliveryAddress,
      paymentMethod: dto.paymentMethod,
      specialInstructions: dto.specialInstructions,
    });
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    return this.orderService.findByUser(req.user.userId, {
      status: query.status as string | undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.orderService.findById(id, req.user.userId);
  }

  @Get(':id/tracking')
  getTracking(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.orderService.getTracking(id, req.user.userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(id, req.user.userId, dto.reason);
  }

  @UseGuards(RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, dto.status);
  }
}
