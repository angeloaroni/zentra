import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { ReportsService } from './reports.service'

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('weekly-digest')
  getWeeklyDigest(@Req() req: any) {
    return this.reportsService.getWeeklyDigest(req.user.id)
  }

  @Get('monthly')
  getMonthlyReport(@Req() req: any, @Query('month') month: string, @Query('year') year: string) {
    return this.reportsService.generatePDF(req.user.id, parseInt(month), parseInt(year))
  }
}
