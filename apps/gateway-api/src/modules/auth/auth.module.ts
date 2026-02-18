import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RedisService } from '../../services/redis.service';
import { EmailService } from '../../services/email.service';
import { User } from '../../entities/user.entity';
import { Address } from '../../entities/address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Address]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is required but not set in environment variables');
        }
        return secret;
      })(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    RedisService,
    EmailService,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, RedisService, EmailService],
})
export class AuthModule {}
