import { Module, OnApplicationBootstrap, Injectable, ExecutionContext } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, HttpAdapterHost } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return super.canActivate(context);
  }
}
import { getDatabaseConfig } from './config/database.config';
import { EventsModule } from './events/events.module';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import { McpModule } from './mcp/mcp.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { ChatModule } from './modules/chat/chat.module';
import { DishModule } from './modules/dish/dish.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { HealthModule } from './modules/health/health.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { SearchModule } from './modules/search/search.module';
import { UserModule } from './modules/user/user.module';
import { BulkOrderModule } from './bulk-order/bulk-order.module';
import { DietPlannerModule } from './diet-planner/diet-planner.module';
import { PartyPlannerModule } from './party-planner/party-planner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('DataSource options are required');
        }
        const dataSource = new DataSource(options);
        await dataSource.initialize();

        // Disable foreign key constraints for SQLite in test mode
        // This allows seed data with hardcoded IDs to be inserted without FK order issues
        if (options.type === 'sqlite' && process.env.NODE_ENV === 'test') {
          await dataSource.query('PRAGMA foreign_keys = OFF');
        }

        return dataSource;
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    EventsModule,
    McpModule,
    AuthModule,
    ChatModule,
    RestaurantModule,
    SearchModule,
    DishModule,
    CartModule,
    OrderModule,
    PaymentModule,
    FeedbackModule,
    UserModule,
    AdminModule,
    HealthModule,
    JobsModule,
    PartyPlannerModule,
    DietPlannerModule,
    BulkOrderModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
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
