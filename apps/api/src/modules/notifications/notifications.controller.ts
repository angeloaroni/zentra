import { Controller, Get, Patch, Delete, Param, Query, Req, UseGuards, Body } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { NotificationsService } from './notifications.service'
import { MarkAllReadDto } from './dto'
import { Request } from 'express'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findMany(
    @Req() req: Request,
    @Query('read') read?: string,
    @Query('type') type?: string,
    @Query('take') take?: string,
  ) {
    return this.notificationsService.findMany((req as any).user.id, {
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      type,
      take: take ? parseInt(take) : undefined,
    })
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    return this.notificationsService.getUnreadCount((req as any).user.id)
  }

  @Patch('mark-all-read')
  async markAllRead(@Req() req: Request, @Body() dto: MarkAllReadDto) {
    return this.notificationsService.markAllRead((req as any).user.id, dto.type)
  }

  @Patch(':id/read')
  async markRead(@Req() req: Request, @Param('id') id: string) {
    return this.notificationsService.markRead((req as any).user.id, id)
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.notificationsService.remove((req as any).user.id, id)
  }

  @Delete()
  async clearAll(@Req() req: Request) {
    return this.notificationsService.clearAll((req as any).user.id)
  }
}