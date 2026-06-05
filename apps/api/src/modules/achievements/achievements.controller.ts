import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AchievementsService } from './achievements.service'

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private achievementsService: AchievementsService) {}

  @Get()
  getAchievements(@Req() req: any) {
    return this.achievementsService.getUserAchievements(req.user.id)
  }

  @Post('check')
  checkAchievements(@Req() req: any) {
    return this.achievementsService.checkAndUnlock(req.user.id)
  }
}
