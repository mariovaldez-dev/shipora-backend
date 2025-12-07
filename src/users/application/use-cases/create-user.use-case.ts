import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';
import { USER_REPOSITORY } from '../../domain/repositories/constants';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { Role, User } from '../../domain/entities/user.entity';
import { UserAlreadyExistsException } from '../../domain/exceptions/user-already-exists.exception';
import { UserCreatedEvent } from '../../domain/events/user-created.event';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  private schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    roles: z.array(z.string()).optional(),
    tenantId: z.string().nullable().optional(),
  });

  async execute(dto: CreateUserDto): Promise<User> {
    try {
      const data = this.schema.parse(dto);

      const existing = await this.userRepository.findByEmail(data.email);
      if (existing) {
        this.logger.warn(`User with email ${data.email} already exists`);
        throw new UserAlreadyExistsException(data.email);
      }

      const email = new Email(data.email);
      const password = await Password.create(data.password);

      // Default roles según tenant
      const roles = data.roles?.length
        ? (data.roles as Role[])
        : data.tenantId
          ? ['tenant_user' as Role]
          : ['user' as Role];

      if (!data.firstName || !data.lastName)
        throw new Error('First and last name are required');

      const user = new User({
        email,
        password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        tenantId: data.tenantId ?? null,
        isActive: true,
        roles: roles,
      });

      user.addEvent(
        new UserCreatedEvent(
          user.id ?? '',
          user.email.getValue(),
          user.tenantId,
        ),
      );

      const created = await this.userRepository.create(user);
      this.logger.log(`User created successfully: ${created.email.getValue()}`);

      return created;
    } catch (error) {
      if (error instanceof UserAlreadyExistsException) throw error;

      if (error instanceof z.ZodError) {
        this.logger.warn('Validation error in CreateUserUseCase', error);
        throw new BadRequestException(error.cause);
      }

      if (error instanceof BadRequestException) {
        this.logger.warn('BadRequest in CreateUserUseCase', error);
        throw error;
      }
      this.logger.error('Unexpected error in CreateUserUseCase', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}
