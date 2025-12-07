import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { CreateSalesOrderDto } from '@modules/orders/application/dto';
import { CreateSalesOrderUseCase } from '@modules/orders/application/use-cases/create-sales-order.use-case';
import { ListUserOrdersUseCase } from '@modules/orders/application/use-cases/list-user-orders.use-case';
import { RecordRateQueryUseCase } from '@modules/orders/application/use-cases/record-rate-query.use-case';
import { GetRateHistoryUseCase } from '@modules/orders/application/use-cases/get-rate-history.use-case';
import { GetCarrierStatsUseCase } from '@modules/orders/application/use-cases/get-carrier-stats.use-case';
import { GetTopRoutesUseCase } from '@modules/orders/application/use-cases/get-top-routes.use-case';
import { GetSalesOrderUseCase } from '@modules/orders/application/use-cases/get-sales-order.use-case';
import { RateQueryDto } from '@modules/orders/application/dto';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { OrderSource } from '@modules/orders/entities/sales-order.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly createSalesOrderUseCase: CreateSalesOrderUseCase,
    private readonly listUserOrdersUseCase: ListUserOrdersUseCase,
    private readonly recordRateQueryUseCase: RecordRateQueryUseCase,
    private readonly getRateHistoryUseCase: GetRateHistoryUseCase,
    private readonly getCarrierStatsUseCase: GetCarrierStatsUseCase,
    private readonly getTopRoutesUseCase: GetTopRoutesUseCase,
    private readonly getSalesOrderUseCase: GetSalesOrderUseCase,
  ) {}

  /**
   * Listar órdenes del usuario
   * GET /orders?limit=50&skip=0
   */
  @Get()
  async listUserOrders(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('page') page?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '50', 10), 100);
    const skipNum = parseInt(skip || '0', 10);
    const pageNum = parseInt(page || '1', 10);

    const orders = await this.listUserOrdersUseCase.execute(
      (req.user?.userId as string) || 'unknown',
      limitNum,
      skipNum,
    );

    // Return paginated response format
    return {
      orders,
      total: orders.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(orders.length / limitNum),
    };
  }

  /**
   * Obtener resumen de estadísticas (todas las órdenes del usuario)
   * GET /orders/stats
   */
  @Get('stats')
  async getOrderStats(@Request() req: any) {
    const userId = (req.user?.userId as string) || 'unknown';

    // Obtener órdenes del usuario
    const orders = await this.listUserOrdersUseCase.execute(userId, 1000, 0);

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
      completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
      cancelledOrders: orders.filter((o) => o.status === 'CANCELLED').length,
      totalValue: orders.reduce((sum, o) => sum + (o.totalValue || 0), 0),
    };

    return stats;
  }

  /**
   * Obtener estadísticas de tarifas por corredor
   * GET /orders/stats/carriers?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('stats/carriers')
  async getCarrierStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await this.getCarrierStatsUseCase.execute(
      (req.user?.userId as string) || 'unknown',
      start,
      end,
    );

    return stats;
  }

  /**
   * Obtener rutas más consultadas (top routes)
   * GET /orders/stats/routes?limit=10
   */
  @Get('stats/routes')
  async getTopRoutes(@Request() req: any, @Query('limit') limit?: string) {
    const limitNum = Math.min(parseInt(limit || '10', 10), 50);
    const routes = await this.getTopRoutesUseCase.execute(
      (req.user?.userId as string) || 'unknown',
      limitNum,
    );

    return routes;
  }

  /**
   * Obtener historial de tarifas del usuario (para KPIs)
   * GET /orders/rates/history?limit=100&skip=0
   */
  @Get('rates/history')
  async getRateHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '100', 10), 500);
    const skipNum = parseInt(skip || '0', 10);

    const history = await this.getRateHistoryUseCase.execute(
      (req.user?.userId as string) || 'unknown',
      limitNum,
      skipNum,
    );

    return history;
  }

  /**
   * Crear una nueva orden de venta
   * POST /orders
   */
  @Post()
  async createOrder(@Body() dto: CreateSalesOrderDto, @Request() req: any) {
    // Validar que tenemos los datos requeridos
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'Items array is required and cannot be empty',
      );
    }

    if (!dto.shippingFrom || !dto.shippingTo) {
      throw new BadRequestException('shippingFrom and shippingTo are required');
    }

    // Extraer userId del JWT (la estrategia JWT retorna userId, no sub)
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID from JWT is required');
    }

    // Capturar metadata del request
    const ipAddress = (req.ip as string) || 'unknown';
    const userAgent = (req.get?.('user-agent') as string) || 'unknown';
    const referer = (req.get?.('referer') as string) || undefined;

    const metadata = {
      source: dto.metadata?.source || OrderSource.API,
      ipAddress,
      userAgent,
      referer,
    };

    // Generar orderNumber único (timestamp + random)
    const orderNumber = `SO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Extract rateMasterId from dto or metadata
    const rateMasterId =
      dto.rateMasterId || dto.metadata?.rateMasterId || undefined;

    const order = await this.createSalesOrderUseCase.execute({
      userId,
      userName: (req.user?.email as string) || 'Unknown',
      orderNumber,
      items: dto.items,
      shippingFrom: dto.shippingFrom,
      shippingTo: dto.shippingTo,
      metadata,
      notes: dto.notes,
      rateMasterId,
    });

    return order;
  }

  /**
   * Registrar una consulta de tarifas (rate query)
   * POST /orders/rates/query
   */
  @Post('rates/query')
  async recordRateQuery(
    @Body() dto: Partial<RateQueryDto>,
    @Request() req: any,
  ) {
    if (!dto.quotes || dto.quotes.length === 0) {
      throw new BadRequestException('Quotes array is required');
    }

    if (!dto.originCountry || !dto.destinationCountry) {
      throw new BadRequestException(
        'originCountry and destinationCountry are required',
      );
    }

    const ipAddress = ((req.ip as string) || 'unknown') as string;
    const userAgent = ((req.get?.('user-agent') as string) ||
      'unknown') as string;

    const rateQuery = await this.recordRateQueryUseCase.execute({
      userId: (req.user?.userId as string) || 'unknown',
      userName: (req.user?.email as string) || 'unknown',
      originCountry: dto.originCountry,
      originCity: dto.originCity,
      destinationCountry: dto.destinationCountry,
      destinationCity: dto.destinationCity,
      weight: dto.weight || 1,
      length: dto.length || 0,
      width: dto.width || 0,
      height: dto.height || 0,
      declaredValue: dto.declaredValue || 0,
      quotes: dto.quotes,
      requestDuration: dto.requestDuration || 0,
      ipAddress,
      userAgent,
    });

    return rateQuery;
  }

  /**
   * Obtener orden por ID - DEBE IR AL FINAL porque :id captura todo
   * GET /orders/:id
   */
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.getSalesOrderUseCase.execute(id);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return order;
  }
}
