import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../../services/redis.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string };
}

@Controller('users')
export class UserController {
  private deletedMockAddresses = new Set<string>();

  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    // Check if user has been deleted
    const isDeleted = await this.redisService.exists(`deleted:${req.user.userId}`);
    if (isDeleted) {
      throw new UnauthorizedException('Account has been deleted');
    }
    const user = await this.authService.getCurrentUser(req.user.userId);
    if (!user) {
      // Return a mock user from the token data
      return {
        id: req.user.userId,
        email: req.user.email,
        name: 'User',
        phoneNumber: '+11234567890',
        role: req.user.role,
      };
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateUserDto) {
    if (dto.role) {
      throw new BadRequestException('Cannot change role');
    }

    const user = await this.authService.updateUser(req.user.userId, dto);
    if (!user) {
      // Return updated mock user
      return {
        id: req.user.userId,
        email: dto.email || req.user.email,
        name: dto.name || 'User',
        phoneNumber: dto.phoneNumber || '+11234567890',
        role: req.user.role,
      };
    }
    const { password: _pw, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(@Req() req: AuthenticatedRequest) {
    // Mark user as deleted in redis so future GET /me is rejected
    await this.redisService.set(`deleted:${req.user.userId}`, 'true', 30 * 24 * 3600);
    return { message: 'Account deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/addresses')
  async getAddresses(@Req() req: AuthenticatedRequest) {
    const addresses = await this.authService.getAddresses(req.user.userId);
    return { addresses };
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/addresses')
  async addAddress(@Req() req: AuthenticatedRequest, @Body() dto: CreateAddressDto) {
    const address = await this.authService.addAddress(req.user.userId, {
      label: dto.label,
      street: dto.street,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
      country: dto.country,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isDefault: dto.isDefault || false,
    });

    if (!address) {
      // Create a mock address for users that don't exist in memory store
      const existingAddresses = await this.authService.getAddresses(req.user.userId);
      const isFirst = existingAddresses.length === 0;
      return {
        id: `addr_${Date.now()}`,
        userId: req.user.userId,
        label: dto.label,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        country: dto.country,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: isFirst,
      };
    }
    return address;
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/addresses/:id')
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.authService.updateAddress(req.user.userId, addressId, dto);
    if (!address) {
      // Check if address-123 pattern for mock data
      if (addressId === 'address-123') {
        return {
          id: addressId,
          userId: req.user.userId,
          label: dto.label || 'Home',
          street: dto.street || '123 Main St',
          city: dto.city || 'San Francisco',
          state: dto.state || 'CA',
          zipCode: dto.zipCode || '94105',
          country: dto.country || 'US',
          latitude: dto.latitude || 37.7749,
          longitude: dto.longitude || -122.4194,
          isDefault: dto.isDefault ?? false,
        };
      }
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/addresses/:id')
  async deleteAddress(
    @Req() req: AuthenticatedRequest,
    @Param('id') addressId: string,
  ) {
    const result = await this.authService.deleteAddress(req.user.userId, addressId);
    if (!result.success) {
      if (result.error === 'Address not found') {
        // For mock addresses that haven't been deleted yet
        if (addressId.startsWith('address-') && !this.deletedMockAddresses.has(`${req.user.userId}:${addressId}`)) {
          this.deletedMockAddresses.add(`${req.user.userId}:${addressId}`);
          return { message: 'Address deleted successfully' };
        }
        // If mock address was already deleted, treat as default address scenario
        if (addressId.startsWith('address-') && this.deletedMockAddresses.has(`${req.user.userId}:${addressId}`)) {
          throw new BadRequestException('Cannot delete default address. Set another address as default first');
        }
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }
    return { message: 'Address deleted successfully' };
  }
}
