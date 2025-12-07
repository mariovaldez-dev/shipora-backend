import { Injectable, Inject } from '@nestjs/common';
import type { ISalesOrderRepository } from '../../domain/repositories/sales-order.repository.interface';
import { SALES_ORDER_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class GetSalesOrderUseCase {
  constructor(
    @Inject(SALES_ORDER_REPOSITORY)
    private readonly salesOrderRepository: ISalesOrderRepository,
  ) {}

  async execute(id: string) {
    return this.salesOrderRepository.findById(id);
  }
}
