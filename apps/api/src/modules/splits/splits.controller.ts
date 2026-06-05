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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
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
  CreateRecurringSplitExpenseDto,
  CreateSplitTemplateDto,
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

  @Post('expenses/:id/receipt')
  @UseInterceptors(FileInterceptor('receipt', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'receipts')
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        cb(null, dir)
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${join(file.originalname)}`
        cb(null, uniqueName)
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|pdf)$/)) {
        cb(new Error('Only images and PDFs are allowed'), false)
      } else {
        cb(null, true)
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadReceipt(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.splitsService.uploadReceipt(id, req.user.id, file)
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
}
