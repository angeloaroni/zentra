import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('search') search?: string) {
    return this.adminService.getUsers(search);
  }

  @Patch('users/:id/plan')
  updatePlan(@Param('id') userId: string, @Body() body: { plan: string }) {
    return this.adminService.updatePlan(userId, body.plan);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }
}