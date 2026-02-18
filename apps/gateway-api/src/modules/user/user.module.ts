import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { User } from '../../entities/user.entity';
import { Address } from '../../entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address]), AuthModule],
  controllers: [UserController],
})
export class UserModule {}
