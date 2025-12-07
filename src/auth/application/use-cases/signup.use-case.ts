import { Injectable } from '@nestjs/common';
import { CreateUserUseCase } from '@users/application/use-cases/create-user.use-case';
import { SignupDto } from '../dto/signup.dto';

@Injectable()
export class SignupUseCase {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  async execute(dto: SignupDto) {
    return this.createUserUseCase.execute({
      ...dto,
    });
  }
}
