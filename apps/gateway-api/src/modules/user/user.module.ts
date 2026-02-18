import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Address } from '../../entities/address.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address]), AuthModule],
  controllers: [UserController],
})
export class UserModule {}
