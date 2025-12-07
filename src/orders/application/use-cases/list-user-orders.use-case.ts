import { Injectable, Inject } from '@nestjs/common';
import type { ISalesOrderRepository } from '../../domain/repositories/sales-order.repository.interface';
import { SALES_ORDER_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class ListUserOrdersUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY)
    private readonly salesOrderRepository: ISalesOrderRepository,
  ) {}

  async execute(userId: string, limit = 50, skip = 0) {
    return this.salesOrderRepository.findByUserId(userId, limit, skip);
  }
}
