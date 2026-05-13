import { Controller, Get, Patch, Post, Delete, Body, UseGuards, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard } from '../subscriptions/plan.guard';
import { Plan } from '../subscriptions/plan.decorator';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto, ChangePasswordDto, DeleteAccountDto, JoinFamilyDto } from './dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() data: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, data);
  }

  @Patch('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    const avatarUrl = `/uploads/avatars/${req.user.id}-${Date.now()}-${file.originalname}`;
    return this.usersService.updateAvatar(req.user.id, avatarUrl);
  }

  @Post('change-password')
  changePassword(@Req() req: any, @Body() data: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, data.currentPassword, data.newPassword);
  }

  @Delete('account')
  deleteAccount(@Req() req: any, @Body() data: DeleteAccountDto) {
    return this.usersService.deleteAccount(req.user.id, data.password);
  }

  @Post('join-family')
  @UseGuards(PlanGuard)
  @Plan('family')
  joinFamily(@Req() req: any, @Body() data: JoinFamilyDto) {
    return this.usersService.joinFamily(req.user.id, data.familyId);
  }

  @Post('leave-family')
  @UseGuards(PlanGuard)
  @Plan('family')
  leaveFamily(@Req() req: any) {
    return this.usersService.leaveFamily(req.user.id);
  }
}