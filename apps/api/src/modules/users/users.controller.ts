import { Controller, Get, Patch, Post, Delete, Body, UseGuards, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard } from '../subscriptions/plan.guard';
import { Plan } from '../subscriptions/plan.decorator';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UpdateProfileDto, ChangePasswordDto, DeleteAccountDto, JoinFamilyDto } from './dto';

const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (req: any, file, callback) => {
    const uniqueSuffix = `${req.user?.id}-${Date.now()}`;
    const ext = extname(file.originalname);
    callback(null, `${uniqueSuffix}${ext}`);
  },
});

const avatarFileFilter = (req: any, file: any, callback: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
    return callback(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'), false);
  }
  callback(null, true);
};

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
  @UseInterceptors(FileInterceptor('avatar', {
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    if (!file) {
      return this.usersService.updateAvatar(req.user.id, null);
    }
    const avatarUrl = `/uploads/avatars/${file.filename}`;
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