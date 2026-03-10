/**
 * Order Controller
 *
 * Handles order-related HTTP endpoints including:
 * - Standard order CRUD operations
 * - Order cancellation with reason
 * - Order tracking
 * - Scheduled order management
 * - Reorder from previous order
 * - Status management (for restaurant owners/admins)
 *
 * Implements FR-CA-ORDER-001.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CancelOrderRequestDto } from './dto/cancel-order.dto';
import { CreateOrderDto, UpdateOrderStatusDto, CancelOrderDto } from './dto/create-order.dto';
import {
  CreateScheduledOrderDto,
  ModifyScheduledOrderDto,
} from './dto/scheduled-order.dto';
import { OrderSagaService } from './order-saga.service';
import { OrderStatusService } from './order-status.service';
import { OrderService } from './order.service';
import { ScheduledOrderService } from './scheduled-order.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string; restaurantId?: string };
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderSagaService: OrderSagaService,
    private readonly scheduledOrderService: ScheduledOrderService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  // ============================================================================
  // Standard Order Endpoints
  // ============================================================================

  /**
   * POST /orders - Create a new order with routing.
   */
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto
  ) {
    const sagaResult = await this.orderSagaService.executeSaga({
      userId: req.user.userId,
      restaurantId: dto.restaurantId,
      items: dto.items,
      deliveryAddress: dto.deliveryAddress,
      paymentMethod: dto.paymentMethod,
      specialInstructions: dto.specialInstructions,
    });

    if (sagaResult.status === 'completed') {
      return {
        orderId: sagaResult.orderId,
        status: sagaResult.status,
        paymentId: sagaResult.paymentId,
        subOrders: sagaResult.subOrders,
      };
    }

    // Saga failed or was compensated — do not silently create an unpaid order
    throw new InternalServerErrorException('Order placement failed. Please try again.');
  }

  /**
   * GET /orders - Get user's orders with optional filtering.
   */
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: Record<string, unknown>
  ) {
    return this.orderService.findByUser(req.user.userId, {
      status: query.status as string | undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  /**
   * GET /orders/:id - Get a specific order.
   */
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.orderService.findById(id, req.user.userId);
  }

  /**
   * GET /orders/:id/tracking - Get tracking details for an order.
   */
  @Get(':id/tracking')
  getTracking(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.orderService.getTracking(id, req.user.userId);
  }

  // ============================================================================
  // Cancellation Endpoints
  // ============================================================================

  /**
   * POST /orders/:id/cancel - Cancel an order with reason.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(
      id,
      req.user.userId,
      dto.reason
    );
  }

  /**
   * POST /orders/:id/cancel-with-reason - Cancel with structured reason.
   */
  @Post(':id/cancel-with-reason')
  @HttpCode(HttpStatus.OK)
  cancelWithReason(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CancelOrderRequestDto,
  ) {
    const reasonText = dto.details
      ? `${dto.reason}: ${dto.details}`
      : dto.reason;
    return this.orderStatusService.cancelOrder(
      id,
      req.user.userId,
      reasonText
    );
  }

  // ============================================================================
  // Scheduled Order Endpoints
  // ============================================================================

  /**
   * POST /orders/scheduled - Create a scheduled order.
   */
  @Post('scheduled')
  async createScheduledOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateScheduledOrderDto
  ) {
    return this.scheduledOrderService.scheduleOrder(
      req.user.userId,
      {
        restaurantId: dto.restaurantId,
        items: dto.items,
        deliveryAddress: dto.deliveryAddress,
        paymentMethod: dto.paymentMethod,
        scheduledTime: dto.scheduledTime,
        specialInstructions: dto.specialInstructions,
      }
    );
  }

  /**
   * GET /orders/scheduled - Get user's scheduled orders.
   */
  @Get('scheduled/list')
  getScheduledOrders(@Req() req: AuthenticatedRequest) {
    return this.scheduledOrderService.getScheduledOrdersForUser(
      req.user.userId
    );
  }

  /**
   * PUT /orders/scheduled/:id - Modify a scheduled order.
   */
  @Put('scheduled/:id')
  async modifyScheduledOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ModifyScheduledOrderDto
  ) {
    return this.scheduledOrderService.modifyScheduledOrder(
      id,
      req.user.userId,
      {
        items: dto.items,
        deliveryAddress: dto.deliveryAddress,
        paymentMethod: dto.paymentMethod,
        scheduledTime: dto.scheduledTime,
        specialInstructions: dto.specialInstructions,
      }
    );
  }

  /**
   * DELETE /orders/scheduled/:id - Cancel a scheduled order.
   */
  @Delete('scheduled/:id')
  @HttpCode(HttpStatus.OK)
  async cancelScheduledOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.scheduledOrderService.cancelScheduledOrder(
      id,
      req.user.userId
    );
  }

  // ============================================================================
  // Reorder Endpoint
  // ============================================================================

  /**
   * POST /orders/:id/reorder - Re-order from a previous order.
   */
  @Post(':id/reorder')
  async reorder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    const previousOrder = await this.orderService.findById(
      id,
      req.user.userId
    );

    const items = previousOrder.items.map((item) => ({
      dishId: item.dishId,
      dishName: item.dishName,
      quantity: item.quantity,
      price: item.price,
      specialInstructions: item.specialInstructions,
    }));

    return this.orderService.create(req.user.userId, {
      restaurantId: previousOrder.restaurantId,
      items,
      deliveryAddress: previousOrder.deliveryAddress,
      paymentMethod: previousOrder.paymentMethod,
      specialInstructions: previousOrder.specialInstructions,
    });
  }

  // ============================================================================
  // Status Management (Restaurant Owner / Admin)
  // ============================================================================

  /**
   * PUT /orders/:id/status - Update order status (restaurant/admin only).
   * Passes requestingUserId for non-admin callers to enable ownership verification.
   */
  @UseGuards(RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: AuthenticatedRequest
  ) {
    const requestingUserId = req.user.role === 'admin' ? undefined : req.user.userId;
    return this.orderService.updateStatus(id, dto.status, requestingUserId);
  }
}
