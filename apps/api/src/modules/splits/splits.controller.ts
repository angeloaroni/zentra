import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Public } from '../../common/guards/public.decorator'
import { PlanGuard } from '../subscriptions/plan.guard'
import { Plan } from '../subscriptions/plan.decorator'
import { SplitsService } from './splits.service'
import {
  CreateGroupDto,
  UpdateGroupDto,
  InviteMemberDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  CreateSettlementDto,
  CreateRecurringSplitExpenseDto,
  CreateSplitTemplateDto,
  UploadReceiptDto,
} from './dto'

@Controller('splits')
@UseGuards(JwtAuthGuard, PlanGuard)
@Plan('pro')
export class SplitsController {
  constructor(private splitsService: SplitsService) {}

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto, @Req() req: any) {
    return this.splitsService.createGroup(req.user.id, dto)
  }

  @Get('groups')
  findGroups(@Req() req: any) {
    return this.splitsService.findGroups(req.user.id)
  }

  @Get('groups/balances/overall')
  getOverallBalances(@Req() req: any) {
    return this.splitsService.getOverallBalances(req.user.id)
  }

  @Get('groups/:id')
  findGroupById(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.findGroupById(id, req.user.id)
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateGroupDto, @Req() req: any) {
    return this.splitsService.updateGroup(id, req.user.id, dto)
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.deleteGroup(id, req.user.id)
  }

  @Post('groups/:id/invite')
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Req() req: any,
  ) {
    return this.splitsService.inviteMember(id, req.user.id, dto.email)
  }

  @Delete('groups/:id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Req() req: any,
  ) {
    return this.splitsService.removeMember(id, req.user.id, memberUserId)
  }

  @Public()
  @Get('invitations/:token')
  getInvitationByToken(@Param('token') token: string) {
    return this.splitsService.getInvitationByToken(token)
  }

  @Post('invitations/:token/accept')
  acceptInvitation(@Param('token') token: string, @Req() req: any) {
    return this.splitsService.acceptInvitation(token, req.user.id)
  }

  @Get('groups/:id/invitations')
  getPendingInvitations(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.getPendingInvitations(id, req.user.id)
  }

  @Delete('invitations/:id')
  cancelInvitation(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.cancelInvitation(id, req.user.id)
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateExpenseDto, @Req() req: any) {
    return this.splitsService.createExpense(req.user.id, dto)
  }

  @Get('expenses')
  findExpenses(@Req() req: any, @Query('groupId') groupId: string) {
    return this.splitsService.findExpenses(req.user.id, groupId)
  }

  @Get('expenses/:id')
  findExpenseById(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.findExpenseById(id, req.user.id)
  }

  @Patch('expenses/:id')
  updateExpense(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: any,
  ) {
    return this.splitsService.updateExpense(id, req.user.id, dto)
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.deleteExpense(id, req.user.id)
  }

  @Get('balances')
  getBalances(@Req() req: any, @Query('groupId') groupId: string) {
    return this.splitsService.getBalances(groupId, req.user.id)
  }

  @Post('settlements')
  createSettlement(@Body() dto: CreateSettlementDto, @Req() req: any) {
    return this.splitsService.createSettlement(req.user.id, dto)
  }

  @Get('settlements')
  findSettlements(@Req() req: any, @Query('groupId') groupId: string) {
    return this.splitsService.findSettlements(groupId, req.user.id)
  }

  @Delete('settlements/:id')
  deleteSettlement(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.deleteSettlement(id, req.user.id)
  }

  @Post('expenses/:id/receipt')
  uploadReceipt(@Param('id') id: string, @Body() dto: UploadReceiptDto, @Req() req: any) {
    return this.splitsService.uploadReceipt(id, req.user.id, dto)
  }

  @Delete('expenses/:id/receipt')
  deleteReceipt(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.deleteReceipt(id, req.user.id)
  }

  @Patch('expenses/:expenseId/splits/:splitId/pay')
  markSplitPaid(@Param('expenseId') expenseId: string, @Param('splitId') splitId: string, @Req() req: any) {
    return this.splitsService.markSplitPaid(expenseId, splitId, req.user.id)
  }

  @Post('recurring')
  createRecurringExpense(@Body() dto: CreateRecurringSplitExpenseDto, @Req() req: any) {
    return this.splitsService.createRecurringExpense(req.user.id, dto)
  }

  @Get('recurring')
  findRecurringExpenses(@Req() req: any, @Query('groupId') groupId: string) {
    return this.splitsService.findRecurringExpenses(groupId, req.user.id)
  }

  @Delete('recurring/:id')
  deleteRecurringExpense(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.deleteRecurringExpense(id, req.user.id)
  }

  @Patch('recurring/:id/toggle')
  toggleRecurringExpense(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.toggleRecurringExpense(id, req.user.id)
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateSplitTemplateDto, @Req() req: any) {
    return this.splitsService.createTemplate(req.user.id, dto)
  }

  @Get('templates')
  findTemplates(@Req() req: any) {
    return this.splitsService.findTemplates(req.user.id)
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string, @Req() req: any) {
    return this.splitsService.deleteTemplate(id, req.user.id)
  }

  @Post('expenses/:id/items')
  addItem(@Param('id') id: string, @Body() dto: { name: string; amount: number; quantity?: number; assignedTo: string[] }, @Req() req: any) {
    return this.splitsService.addExpenseItem(id, req.user.id, dto)
  }

  @Delete('expenses/items/:itemId')
  removeItem(@Param('itemId') itemId: string, @Req() req: any) {
    return this.splitsService.removeExpenseItem(itemId, req.user.id)
  }

  @Get('currencies/rates')
  getCurrencyRates() {
    return {
      EUR: 1, USD: 1.08, GBP: 0.86, MXN: 19.5, COP: 4200,
      ARS: 950, CLP: 950, PEN: 3.8, BRL: 5.4, VES: 36,
    }
  }

  @Get('currencies/convert')
  convertCurrency(@Query('amount') amount: string, @Query('from') from: string, @Query('to') to: string) {
    const rates: Record<string, number> = {
      EUR: 1, USD: 1.08, GBP: 0.86, MXN: 19.5, COP: 4200,
      ARS: 950, CLP: 950, PEN: 3.8, BRL: 5.4, VES: 36,
    }
    const fromRate = rates[from] || 1
    const toRate = rates[to] || 1
    const result = (parseFloat(amount) / fromRate) * toRate
    return { amount: parseFloat(amount), from, to, result: Math.round(result * 100) / 100 }
  }
}
