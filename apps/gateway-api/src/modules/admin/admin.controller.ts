import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApproveRestaurantDto, RejectRestaurantDto, SuspendUserDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(@Query() query: Record<string, unknown>) {
    return this.adminService.getUsers({
      role: query.role as string | undefined,
      search: query.search as string | undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('restaurants/pending')
  getPendingRestaurants(@Query() query: Record<string, unknown>) {
    return this.adminService.getPendingRestaurants({
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Put('restaurants/:id/approve')
  approveRestaurant(@Param('id') id: string, @Body() dto: ApproveRestaurantDto) {
    return this.adminService.approveRestaurant(id, dto.approvalNotes);
  }

  @Put('restaurants/:id/reject')
  rejectRestaurant(@Param('id') id: string, @Body() dto: RejectRestaurantDto) {
    return this.adminService.rejectRestaurant(id, dto.rejectionReason);
  }

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Put('users/:id/suspend')
  suspendUser(@Param('id') id: string, @Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(id, dto.reason, dto.duration || 7);
  }

  @Put('users/:id/reactivate')
  reactivateUser(@Param('id') id: string) {
    return this.adminService.reactivateUser(id);
  }
}
