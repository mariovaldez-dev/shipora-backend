import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IGuideRepository } from '../../domain/repositories/guide.repository.interface';
import { GUIDE_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class GetGuideUseCase {
  constructor(
    @Inject(GUIDE_REPOSITORY)
    private readonly guideRepository: IGuideRepository,
  ) {}

  async execute(id: string) {
    const guide = await this.guideRepository.findById(id);
    if (!guide) {
      throw new NotFoundException(`Guide with ID ${id} not found`);
    }
    return guide;
  }

  async byTrackingNumber(trackingNumber: string) {
    const guide = await this.guideRepository.findByTrackingNumber(trackingNumber);
    if (!guide) {
      throw new NotFoundException(`Guide with tracking number ${trackingNumber} not found`);
    }
    return guide;
  }
}
