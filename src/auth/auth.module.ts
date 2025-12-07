import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './infrastructure/controllers/auth.controller';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { UsersModule } from '@modules/users/users.module';
import { RolesModule } from '@modules/roles/roles.module';
import jwtConfig from '@config/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'fallback-secret',
        signOptions: {
          expiresIn: '1d',
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    RolesModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LoginUseCase, SignupUseCase],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
