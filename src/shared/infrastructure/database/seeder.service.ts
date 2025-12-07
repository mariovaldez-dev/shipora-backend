import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectModel('SalesOrder') private readonly orderModel: Model<any>,
    @InjectModel('Guide') private readonly guideModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('Organization')
    private readonly organizationModel: Model<any>,
    @InjectModel('OrganizationMember')
    private readonly memberModel: Model<any>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const shouldSeed = this.configService.get('SEED_DATABASE') === 'true';
    if (shouldSeed) {
      await this.seed();
    }
  }

  async seed() {
    this.logger.log('🌱 Starting database seeding...');

    try {
      // Check if we already have data
      const existingOrders = await this.orderModel.countDocuments();
      if (existingOrders > 0) {
        this.logger.log('Database already has data, skipping seed');
        return;
      }

      // Get or create a test user
      let testUser = await this.userModel.findOne({
        email: 'test@shipora.com',
      });
      if (!testUser) {
        this.logger.log('Creating test user...');
        testUser = await this.userModel.create({
          _id: new Types.ObjectId().toString(),
          email: 'test@shipora.com',
          password: '$2b$10$dummyhashedpassword', // This won't work for login
          firstName: 'Test',
          lastName: 'User',
          roles: ['user'],
          isActive: true,
        });
      }

      const userId = testUser._id;

      // Create organization
      await this.seedOrganizations(userId.toString());

      // Create orders
      await this.seedOrders(userId);

      // Create guides
      await this.seedGuides(userId);

      this.logger.log('✅ Database seeding completed!');
    } catch (error) {
      this.logger.error('❌ Error seeding database:', error);
    }
  }

  private async seedOrganizations(userId: string) {
    this.logger.log('Creating organizations...');

    const org = await this.organizationModel.create({
      _id: new Types.ObjectId().toString(),
      name: 'Shipora Demo Company',
      slug: 'shipora-demo',
      description: 'Empresa de demostración para Shipora',
      ownerId: userId,
      settings: {
        defaultCarrier: 'estafeta',
        autoApproveOrders: true,
        notificationsEnabled: true,
      },
      billing: {
        plan: 'professional',
      },
      isActive: true,
      allowedDomains: ['shipora.com'],
    });

    await this.memberModel.create({
      _id: new Types.ObjectId().toString(),
      organizationId: org._id,
      userId: userId,
      role: 'owner',
      status: 'active',
      permissions: {
        canManageOrders: true,
        canManageGuides: true,
        canManageMembers: true,
        canViewReports: true,
        canManageBilling: true,
        canManageSettings: true,
        canManageIntegrations: true,
      },
      joinedAt: new Date(),
    });

    this.logger.log(`Created organization: ${org.name}`);
  }

  private async seedOrders(userId: Types.ObjectId) {
    this.logger.log('Creating orders...');

    const carriers = ['Estafeta', 'FedEx', 'DHL', 'UPS', 'Paquetexpress'];
    const statuses = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'COMPLETED',
      'CANCELLED',
    ];
    const cities = [
      { city: 'Ciudad de México', state: 'CDMX', postalCode: '06600' },
      { city: 'Guadalajara', state: 'Jalisco', postalCode: '44100' },
      { city: 'Monterrey', state: 'Nuevo León', postalCode: '64000' },
      { city: 'Puebla', state: 'Puebla', postalCode: '72000' },
      { city: 'Tijuana', state: 'Baja California', postalCode: '22000' },
      { city: 'León', state: 'Guanajuato', postalCode: '37000' },
      { city: 'Mérida', state: 'Yucatán', postalCode: '97000' },
      { city: 'Querétaro', state: 'Querétaro', postalCode: '76000' },
    ];

    const orders: Record<string, unknown>[] = [];
    const now = new Date();

    for (let i = 0; i < 150; i++) {
      const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const originCity = cities[Math.floor(Math.random() * cities.length)];
      const destCity = cities[Math.floor(Math.random() * cities.length)];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];
      const status = this.getWeightedStatus(statuses, daysAgo);
      const shippingCost = 150 + Math.random() * 350;
      const totalValue = 500 + Math.random() * 5000;

      orders.push({
        orderNumber: `ORD-2024-${String(1000 + i).padStart(4, '0')}`,
        userId,
        userName: 'Test User',
        status,
        metadata: {
          source: 'WEB',
          userAgent: 'Mozilla/5.0',
        },
        items: [
          {
            description: `Producto ${i + 1}`,
            quantity: 1 + Math.floor(Math.random() * 3),
            weight: 0.5 + Math.random() * 10,
            length: 10 + Math.random() * 40,
            width: 10 + Math.random() * 30,
            height: 5 + Math.random() * 20,
            value: totalValue,
          },
        ],
        shippingFrom: {
          firstName: 'Remitente',
          lastName: 'Test',
          email: 'remitente@test.com',
          phone: '+52 55 1234 5678',
          address: 'Calle Principal 123',
          city: originCity.city,
          state: originCity.state,
          postalCode: originCity.postalCode,
          country: 'MX',
        },
        shippingTo: {
          firstName: 'Destinatario',
          lastName: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@test.com`,
          phone: '+52 55 8765 4321',
          address: `Avenida Secundaria ${100 + i}`,
          city: destCity.city,
          state: destCity.state,
          postalCode: destCity.postalCode,
          country: 'MX',
        },
        selectedCarrier: carrier,
        shippingCost: Math.round(shippingCost * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        shipmentIds: [],
        requestedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        ...(status === 'CONFIRMED' && {
          confirmedAt: new Date(createdAt.getTime() + 3600000),
        }),
        ...(status === 'COMPLETED' && {
          confirmedAt: new Date(createdAt.getTime() + 3600000),
          completedAt: new Date(createdAt.getTime() + 86400000 * 3),
        }),
        ...(status === 'CANCELLED' && {
          cancelledAt: new Date(createdAt.getTime() + 7200000),
          cancelReason: 'Cliente canceló el pedido',
        }),
      });
    }

    await this.orderModel.insertMany(orders);
    this.logger.log(`Created ${orders.length} orders`);
  }

  private async seedGuides(userId: Types.ObjectId) {
    this.logger.log('Creating guides...');

    const carriers = [
      { id: 'estafeta', name: 'Estafeta', serviceType: 'express' },
      { id: 'fedex', name: 'FedEx', serviceType: 'priority' },
      { id: 'dhl', name: 'DHL', serviceType: 'express' },
      { id: 'ups', name: 'UPS', serviceType: 'ground' },
      { id: 'paquetexpress', name: 'Paquetexpress', serviceType: 'standard' },
    ];
    const statuses = [
      'PENDING',
      'LABEL_CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];
    const cities = [
      { city: 'Ciudad de México', state: 'CDMX', zipCode: '06600' },
      { city: 'Guadalajara', state: 'Jalisco', zipCode: '44100' },
      { city: 'Monterrey', state: 'Nuevo León', zipCode: '64000' },
      { city: 'Puebla', state: 'Puebla', zipCode: '72000' },
      { city: 'Tijuana', state: 'Baja California', zipCode: '22000' },
    ];

    const guides: Record<string, unknown>[] = [];
    const now = new Date();

    for (let i = 0; i < 120; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const originCity = cities[Math.floor(Math.random() * cities.length)];
      const destCity = cities[Math.floor(Math.random() * cities.length)];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];
      const status = this.getWeightedGuideStatus(statuses, daysAgo);
      const basePrice = 100 + Math.random() * 200;
      const weight = 0.5 + Math.random() * 15;

      guides.push({
        trackingNumber: `SHP${Date.now()}${String(i).padStart(4, '0')}`,
        userId,
        status,
        carrier,
        origin: {
          contactName: 'Remitente Test',
          email: 'remitente@shipora.com',
          phone: '+52 55 1234 5678',
          street: 'Calle Origen',
          exteriorNumber: '123',
          neighborhood: 'Colonia Centro',
          ...originCity,
          country: 'MX',
        },
        destination: {
          contactName: `Destinatario ${i + 1}`,
          email: `destino${i + 1}@test.com`,
          phone: '+52 55 8765 4321',
          street: 'Avenida Destino',
          exteriorNumber: `${100 + i}`,
          neighborhood: 'Colonia Norte',
          ...destCity,
          country: 'MX',
        },
        products: [
          {
            sku: `SKU-${1000 + i}`,
            name: `Producto ${i + 1}`,
            quantity: 1,
            weight: weight,
            dimensions: { length: 20, width: 15, height: 10 },
            value: 500 + Math.random() * 2000,
            isFragile: Math.random() > 0.7,
          },
        ],
        weight: Math.round(weight * 100) / 100,
        volumetricWeight: Math.round(((20 * 15 * 10) / 5000) * 100) / 100,
        chargeableWeight:
          Math.round(Math.max(weight, (20 * 15 * 10) / 5000) * 100) / 100,
        dimensions: { length: 20, width: 15, height: 10 },
        pricing: {
          basePrice: Math.round(basePrice * 100) / 100,
          insurance: Math.round(basePrice * 0.03 * 100) / 100,
          fuel: Math.round(basePrice * 0.08 * 100) / 100,
          handling: 25,
          total: Math.round((basePrice * 1.11 + 25) * 100) / 100,
          currency: 'MXN',
        },
        estimatedDelivery: new Date(createdAt.getTime() + 86400000 * 3),
        trackingHistory: this.generateTrackingHistory(status, createdAt),
        isPrinted: [
          'PICKED_UP',
          'IN_TRANSIT',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
        ].includes(status),
        isShipped: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(
          status,
        ),
        priority: ['normal', 'normal', 'normal', 'high', 'urgent'][
          Math.floor(Math.random() * 5)
        ],
        createdAt,
        updatedAt: createdAt,
        ...(status === 'DELIVERED' && {
          deliveredAt: new Date(createdAt.getTime() + 86400000 * 2),
          shippedAt: new Date(createdAt.getTime() + 86400000),
        }),
        ...(status === 'IN_TRANSIT' && {
          shippedAt: new Date(createdAt.getTime() + 86400000),
        }),
        ...(status === 'CANCELLED' && {
          cancelledAt: new Date(createdAt.getTime() + 7200000),
          cancelReason: 'Dirección incorrecta',
        }),
      });
    }

    await this.guideModel.insertMany(guides);
    this.logger.log(`Created ${guides.length} guides`);
  }

  private getWeightedStatus(statuses: string[], daysAgo: number): string {
    // Older orders more likely to be completed
    if (daysAgo > 30) {
      const weights = [0.05, 0.05, 0.1, 0.75, 0.05];
      return this.weightedRandom(statuses, weights);
    } else if (daysAgo > 7) {
      const weights = [0.1, 0.15, 0.25, 0.45, 0.05];
      return this.weightedRandom(statuses, weights);
    } else {
      const weights = [0.3, 0.25, 0.25, 0.15, 0.05];
      return this.weightedRandom(statuses, weights);
    }
  }

  private getWeightedGuideStatus(statuses: string[], daysAgo: number): string {
    if (daysAgo > 30) {
      const weights = [0.02, 0.03, 0.05, 0.1, 0.05, 0.72, 0.03];
      return this.weightedRandom(statuses, weights);
    } else if (daysAgo > 7) {
      const weights = [0.05, 0.1, 0.1, 0.25, 0.1, 0.35, 0.05];
      return this.weightedRandom(statuses, weights);
    } else {
      const weights = [0.2, 0.25, 0.15, 0.2, 0.1, 0.05, 0.05];
      return this.weightedRandom(statuses, weights);
    }
  }

  private weightedRandom(items: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  private generateTrackingHistory(
    status: string,
    createdAt: Date,
  ): Record<string, unknown>[] {
    const history: Record<string, unknown>[] = [];
    const statusFlow = [
      'PENDING',
      'LABEL_CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    const statusIndex = statusFlow.indexOf(status);

    if (statusIndex === -1) {
      // Cancelled
      history.push({
        timestamp: createdAt,
        status: 'PENDING',
        location: 'Sistema',
        description: 'Guía creada',
      });
      history.push({
        timestamp: new Date(createdAt.getTime() + 7200000),
        status: 'CANCELLED',
        location: 'Sistema',
        description: 'Guía cancelada',
      });
      return history;
    }

    const descriptions = [
      'Guía creada en el sistema',
      'Etiqueta generada correctamente',
      'Paquete recolectado por mensajería',
      'Paquete en tránsito hacia destino',
      'Paquete en camino para entrega',
      'Entregado exitosamente',
    ];

    for (let i = 0; i <= statusIndex; i++) {
      history.push({
        timestamp: new Date(createdAt.getTime() + (i * 86400000) / 2),
        status: statusFlow[i],
        location: i < 3 ? 'Origen' : 'En ruta',
        description: descriptions[i],
      });
    }

    return history;
  }
}
