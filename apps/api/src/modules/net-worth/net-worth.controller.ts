import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { NetWorthService } from './net-worth.service'

@Controller('net-worth')
@UseGuards(JwtAuthGuard)
export class NetWorthController {
  constructor(private netWorthService: NetWorthService) {}

  @Get()
  getNetWorthHistory(@Req() req: any, @Query('months') months?: string) {
    return this.netWorthService.getNetWorthHistory(req.user.id, months ? parseInt(months) : 12)
  }

  @Get('current')
  getCurrentBalance(@Req() req: any) {
    return this.netWorthService.getCurrentBalance(req.user.id)
  }
}
