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
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string; restaurantId?: string };
}

@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Public()
  @Get('search')
  search(@Query() query: Record<string, unknown>) {
    return this.restaurantService.search({
      query: query.query as string | undefined,
      latitude: query.latitude ? Number(query.latitude) : undefined,
      longitude: query.longitude ? Number(query.longitude) : undefined,
      radius: query.radius ? Number(query.radius) : undefined,
      cuisineTypes: query.cuisineTypes as string[] | undefined,
      priceRange: query.priceRange as string[] | undefined,
      minRating: query.minRating ? Number(query.minRating) : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Public()
  @Get(':id/menu')
  getMenu(@Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.restaurantService.getMenu(id, {
      category: query.category as string | undefined,
      isVegetarian: query.isVegetarian === 'true' ? true : undefined,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // If user is admin, allow seeing inactive restaurants
    if (req.user?.role === 'admin') {
      return this.restaurantService.findByIdWithAuth(id);
    }
    return this.restaurantService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRestaurantDto) {
    return this.restaurantService.create({
      ...dto,
      ownerId: dto.ownerId || req.user.userId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: Partial<CreateRestaurantDto>,
  ) {
    return this.restaurantService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  delete(@Param('id') id: string) {
    this.restaurantService.delete(id);
    return { message: 'Restaurant deleted successfully' };
  }
}
