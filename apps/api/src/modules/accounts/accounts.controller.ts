import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Post()
  create(@Body() data: CreateAccountDto, @Req() req: any) {
    return this.accountsService.create(req.user.id, data);
  }

  @Get()
  findMany(
    @Req() req: any,
    @Query('familyId') familyId?: string,
  ) {
    return this.accountsService.findMany(req.user.id, familyId);
  }

  @Get('total')
  getTotalBalance(
    @Req() req: any,
    @Query('familyId') familyId?: string,
  ) {
    return this.accountsService.getTotalBalance(req.user.id, familyId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.accountsService.findById(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateAccountDto,
    @Req() req: any,
  ) {
    return this.accountsService.update(id, req.user.id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.accountsService.remove(id, req.user.id);
  }
}