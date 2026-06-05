import { Controller, Get, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { HealthScoreService } from './health-score.service'

@Controller('health-score')
@UseGuards(JwtAuthGuard)
export class HealthScoreController {
  constructor(private healthScoreService: HealthScoreService) {}

  @Get()
  getScore(@Req() req: any) {
    return this.healthScoreService.getScore(req.user.id)
  }
}
