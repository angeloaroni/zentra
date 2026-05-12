import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get('default')
  getDefault() {
    return this.categoriesService.getDefaultCategories();
  }

  @Get()
  findMany(
    @Req() req: any,
    @Query('type') type?: 'INCOME' | 'EXPENSE' | 'BOTH',
    @Query('familyId') familyId?: string,
    @Query('includeDefault') includeDefault?: string,
  ) {
    return this.categoriesService.findMany(req.user.id, {
      type,
      familyId,
      includeDefault: includeDefault === 'true',
    });
  }

  @Post()
  create(@Body() data: CreateCategoryDto, @Req() req: any) {
    return this.categoriesService.create(req.user.id, data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateCategoryDto, @Req() req: any) {
    return this.categoriesService.update(id, req.user.id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.remove(id, req.user.id);
  }
}