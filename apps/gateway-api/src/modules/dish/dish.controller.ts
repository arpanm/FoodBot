import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DishService } from './dish.service';
import { CreateDishDto, UpdateAvailabilityDto } from './dto/create-dish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; role: string; restaurantId?: string };
}

@Controller('dishes')
export class DishController {
  constructor(private readonly dishService: DishService) {}

  @Public()
  @Get('search')
  search(@Query() query: Record<string, unknown>) {
    return this.dishService.search({
      query: query.query as string | undefined,
      restaurantId: query.restaurantId as string | undefined,
      category: query.category as string | undefined,
      isVegetarian: query.isVegetarian === 'true' ? true : query.isVegetarian === 'false' ? false : undefined,
      isVegan: query.isVegan === 'true' ? true : query.isVegan === 'false' ? false : undefined,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.dishService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDishDto) {
    return this.dishService.create({
      ...dto,
      restaurantId: dto.restaurantId || req.user.restaurantId || '',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: Partial<CreateDishDto>,
  ) {
    const restaurantId = req.user.restaurantId || '';
    return this.dishService.update(id, restaurantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const restaurantId = req.user.restaurantId || '';
    this.dishService.delete(id, restaurantId);
    return { message: 'Dish deleted successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('restaurant_owner', 'admin')
  @Patch(':id/availability')
  toggleAvailability(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const restaurantId = req.user.restaurantId || '';
    return this.dishService.toggleAvailability(id, restaurantId, dto.isAvailable);
  }
}
