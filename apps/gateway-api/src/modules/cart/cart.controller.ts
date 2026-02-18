import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CartService } from './cart.service';
import { AddItemDto, UpdateItemDto } from './dto/add-item.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  addItem(@Req() req: AuthenticatedRequest, @Body() dto: AddItemDto) {
    return this.cartService.addItem(
      req.user.userId,
      dto.dishId,
      dto.quantity,
      dto.specialInstructions,
    );
  }

  @Put('items/:id')
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('id') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(
      req.user.userId,
      itemId,
      dto.quantity,
      dto.specialInstructions,
    );
  }

  @Delete('items/:id')
  async removeItem(@Req() req: AuthenticatedRequest, @Param('id') itemId: string) {
    await this.cartService.removeItem(req.user.userId, itemId);
    return { message: 'Item removed from cart' };
  }

  @Delete()
  async clearCart(@Req() req: AuthenticatedRequest) {
    await this.cartService.clearCart(req.user.userId);
    return { message: 'Cart cleared successfully' };
  }
}
