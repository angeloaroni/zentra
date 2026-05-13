import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard } from '../subscriptions/plan.guard';
import { Plan } from '../subscriptions/plan.decorator';
import { FamiliesService } from './families.service';
import { CreateFamilyDto, UpdateFamilyDto, InviteMemberDto } from './dto';

@Controller('families')
@UseGuards(JwtAuthGuard, PlanGuard)
@Plan('family')
export class FamiliesController {
  constructor(private familiesService: FamiliesService) {}

  @Post()
  create(@Body() data: CreateFamilyDto, @Req() req: any) {
    return this.familiesService.create(req.user.id, data.name);
  }

  @Get()
  findByUser(@Req() req: any) {
    return this.familiesService.findByUserId(req.user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.familiesService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateFamilyDto, @Req() req: any) {
    return this.familiesService.update(id, req.user.id, data);
  }

  @Post(':id/invite')
  inviteMember(@Param('id') familyId: string, @Body() data: InviteMemberDto, @Req() req: any) {
    return this.familiesService.inviteMember(familyId, req.user.id, data.email);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') familyId: string, @Param('userId') memberUserId: string, @Req() req: any) {
    return this.familiesService.removeMember(familyId, req.user.id, memberUserId);
  }

  @Get(':id/members')
  getMembers(@Param('id') familyId: string) {
    return this.familiesService.getMembers(familyId);
  }
}