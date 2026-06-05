import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { GoalsModule } from './modules/goals/goals.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { RecurringModule } from './modules/recurring/recurring.module';
import { TagsModule } from './modules/tags/tags.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SplitsModule } from './modules/splits/splits.module';
import { NetWorthModule } from './modules/net-worth/net-worth.module';
import { InsightsModule } from './modules/insights/insights.module';
import { HealthScoreModule } from './modules/health/health-score.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamiliesModule,
    TransactionsModule,
    CategoriesModule,
    BudgetsModule,
    GoalsModule,
    AccountsModule,
    RecurringModule,
    TagsModule,
    SubscriptionsModule,
    AdminModule,
    NotificationsModule,
    SplitsModule,
    NetWorthModule,
    InsightsModule,
    HealthScoreModule,
    AchievementsModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}