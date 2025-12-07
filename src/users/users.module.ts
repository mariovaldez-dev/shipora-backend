/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './infrastructure/persistence/schema/user.schema';
import { UserRepository } from './infrastructure/persistence/repositories/user.repository';
import { UsersController } from './infrastructure/controllers/users.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { RolesModule } from '@modules/roles/roles.module';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { USER_REPOSITORY } from './domain/repositories/constants';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    RolesModule,
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    CreateUserUseCase,
    AssignRoleUseCase,
    GetUserUseCase,
    DeleteUserUseCase,
    ListUsersUseCase,
  ],
  exports: [USER_REPOSITORY, CreateUserUseCase],
})
export class UsersModule {}
