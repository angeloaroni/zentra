import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
})
export class AppModule {}