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
}
