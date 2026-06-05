import { Module } from '@nestjs/common'
import { NetWorthService } from './net-worth.service'
import { NetWorthController } from './net-worth.controller'

@Module({
  controllers: [NetWorthController],
  providers: [NetWorthService],
  exports: [NetWorthService],
})
export class NetWorthModule {}
