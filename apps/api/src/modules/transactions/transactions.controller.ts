import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard } from '../subscriptions/plan.guard';
import { Plan } from '../subscriptions/plan.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard, PlanGuard)
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto, @Req() req: any) {
    return this.transactionsService.create(req.user.id, dto);
  }

  @Get()
  findMany(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: 'INCOME' | 'EXPENSE',
    @Query('categoryId') categoryId?: string,
    @Query('familyId') familyId?: string,
    @Query('search') search?: string,
    @Query('recurring') recurring?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('tagId') tagId?: string,
  ) {
    return this.transactionsService.findMany(req.user.id, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      categoryId,
      familyId,
      search,
      isRecurring: recurring === 'true' ? true : recurring === 'false' ? false : undefined,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
      paymentMethod,
      tagId,
    });
  }

  @Get('summary')
  getSummary(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.transactionsService.getSummary(req.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      familyId,
    });
  }

  @Get('cashflow')
  @Plan('pro')
  getCashflow(
    @Req() req: any,
    @Query('months') months?: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.transactionsService.getCashflow(req.user.id, months ? parseInt(months) : 6, familyId);
  }

  @Get('comparison')
  @Plan('pro')
  getComparison(
    @Req() req: any,
    @Query('familyId') familyId?: string,
  ) {
    return this.transactionsService.getComparison(req.user.id, familyId);
  }

  @Get('by-category')
  getByCategory(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('familyId') familyId?: string,
  ) {
    return this.transactionsService.getByCategory(req.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      familyId,
    });
  }

  @Get('by-tag/:tagId')
  @Plan('pro')
  findByTag(@Param('tagId') tagId: string, @Req() req: any, @Query('familyId') familyId?: string) {
    return this.transactionsService.findByTag(tagId, req.user.id, familyId);
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  getOverview(@Req() req: any, @Query('familyId') familyId?: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.transactionsService.getOverview(req.user.id, familyId, startDate, endDate);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.transactionsService.findById(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateTransactionDto>, @Req() req: any) {
    return this.transactionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.transactionsService.remove(id, req.user.id);
  }
}
