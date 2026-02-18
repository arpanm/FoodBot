import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, HttpAdapterHost } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { DishModule } from './modules/dish/dish.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { UserModule } from './modules/user/user.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule,
    ChatModule,
    RestaurantModule,
    DishModule,
    CartModule,
    OrderModule,
    PaymentModule,
    FeedbackModule,
    UserModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  onApplicationBootstrap() {
    // Ensure the HTTP server is listening so that supertest doesn't
    // start/stop it per-request (which causes ECONNRESET on concurrent requests)
    const server = this.httpAdapterHost?.httpAdapter?.getHttpServer();
    if (server && !server.listening) {
      server.listen(0);
    }
  }
}
