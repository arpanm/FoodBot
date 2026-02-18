import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto, ConfirmPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiatePayment(@Req() req: AuthenticatedRequest, @Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiatePayment(req.user.userId, {
      orderId: dto.orderId,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      cardDetails: dto.cardDetails,
      upiId: dto.upiId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirmPayment(@Req() req: AuthenticatedRequest, @Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(req.user.userId, dto.paymentId, dto.confirmationToken);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(
      {
        event: body.event as string,
        paymentId: body.paymentId as string,
        amount: body.amount as number | undefined,
        status: body.status as string | undefined,
        reason: body.reason as string | undefined,
        signature: body.signature as string | undefined,
      },
      signature,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  getPaymentStatus(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    try {
      return this.paymentService.getPaymentStatus(req.user.userId, id);
    } catch (error) {
      if (error instanceof Error && error.message === 'Forbidden resource') {
        throw new ForbiddenException('Forbidden resource');
      }
      throw error;
    }
  }
}
