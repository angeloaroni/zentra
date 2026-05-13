import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard } from '../subscriptions/plan.guard';
import { Plan } from '../subscriptions/plan.decorator';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Controller('tags')
@UseGuards(JwtAuthGuard, PlanGuard)
@Plan('pro')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Post()
  create(@Body() dto: CreateTagDto, @Req() req: any) {
    return this.tagsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('familyId') familyId?: string) {
    return this.tagsService.findAll(req.user.id, familyId);
  }

  @Get(':id/details')
  findByIdWithStats(@Param('id') id: string, @Req() req: any, @Query('familyId') familyId?: string) {
    return this.tagsService.findByIdWithStats(id, req.user.id, familyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.tagsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto, @Req() req: any) {
    return this.tagsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tagsService.remove(id, req.user.id);
  }
}
