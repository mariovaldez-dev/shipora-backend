import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import type { IGuideRepository } from '../../domain/repositories/guide.repository.interface';
import { GUIDE_REPOSITORY } from '../../domain/repositories/constants';
import { CreateGuideCommand } from '../dto';
import { GuideStatus } from '../../entities/guide.entity';

@Injectable()
export class CreateGuideUseCase {
  constructor(
    @Inject(GUIDE_REPOSITORY)
    private readonly guideRepository: IGuideRepository,
  ) {}

  async execute(command: CreateGuideCommand) {
    const guideData = {
      ...command,
      userId: new Types.ObjectId(command.userId),
      orderId: command.orderId ? new Types.ObjectId(command.orderId) : undefined,
      status: GuideStatus.LABEL_CREATED,
      estimatedDelivery: command.estimatedDelivery
        ? new Date(command.estimatedDelivery)
        : undefined,
      trackingHistory: [
        {
          timestamp: new Date(),
          status: 'Guía creada',
          location: command.origin.city,
          description: 'La guía de envío ha sido generada exitosamente',
        },
      ],
    };

    return this.guideRepository.create(guideData);
  }
}
