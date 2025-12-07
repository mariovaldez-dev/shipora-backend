/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RoleDocument,
  RoleSchema,
} from './infrastructure/persistence/schema/role.schema';
import { RolesController } from './infrastructure/controllers/roles.controller';
import { ROLE_REPOSITORY } from './domain/repositories/role.repository.interface';
import { RoleRepository } from './infrastructure/persistence/repositories/role.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoleDocument.name, schema: RoleSchema },
    ]),
  ],
  controllers: [RolesController],
  providers: [
    {
      provide: ROLE_REPOSITORY,
      useClass: RoleRepository,
    },
  ],
  exports: [ROLE_REPOSITORY],
})
export class RolesModule {}
