import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard } from '../subscriptions/plan.guard';
import { Plan } from '../subscriptions/plan.decorator';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard, PlanGuard)
@Plan('pro')
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  findMany(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('categoryId') categoryId?: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.budgetsService.findMany(req.user.id, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      categoryId,
      familyId,
    });
  }

  @Post()
  create(@Body() data: CreateBudgetDto, @Req() req: any) {
    return this.budgetsService.create(req.user.id, data);
  }

  @Get('summary')
  getCurrentMonthSummary(
    @Req() req: any,
    @Query('familyId') familyId?: string,
  ) {
    return this.budgetsService.getCurrentMonthSummary(req.user.id, familyId);
  }

  @Get('alerts')
  getAlerts(
    @Req() req: any,
    @Query('familyId') familyId?: string,
  ) {
    return this.budgetsService.getAlerts(req.user.id, familyId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.budgetsService.findById(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateBudgetDto, @Req() req: any) {
    return this.budgetsService.update(id, req.user.id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.budgetsService.remove(id, req.user.id);
  }
}