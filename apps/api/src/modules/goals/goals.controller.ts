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
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto, ContributeToGoalDto } from './dto';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Post()
  create(@Body() data: CreateGoalDto, @Req() req: any) {
    return this.goalsService.create(req.user.id, data);
  }

  @Get()
  findMany(
    @Req() req: any,
    @Query('familyId') familyId?: string,
  ) {
    return this.goalsService.findMany(req.user.id, familyId);
  }

  @Get(':id')
  findById(@Param('id') id: string, @Req() req: any) {
    return this.goalsService.findById(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateGoalDto, @Req() req: any) {
    return this.goalsService.update(id, req.user.id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.goalsService.remove(id, req.user.id);
  }

  @Post(':id/contribute')
  contribute(@Param('id') id: string, @Body() data: ContributeToGoalDto, @Req() req: any) {
    return this.goalsService.contribute(id, req.user.id, data.amount);
  }
}