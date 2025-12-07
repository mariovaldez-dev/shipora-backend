import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CoverageZone,
  CoverageZoneStatus,
  CoverageZoneType,
  ZoneService,
  PricingType,
} from '../entities/coverage-zone.entity';
import {
  CreateCoverageZoneDto,
  UpdateCoverageZoneDto,
  QueryCoverageZonesDto,
  CheckCoverageDto,
  CalculateRateDto,
  PostalCodesDto,
  BulkStatusUpdateDto,
} from '../dto/coverage.dto';

export interface CoverageCheckResult {
  isCovered: boolean;
  zones: CoverageZone[];
  availableServices: AvailableService[];
  restrictions?: string[];
}

export interface AvailableService {
  zone: {
    _id: string;
    name: string;
    code: string;
  };
  service: ZoneService;
  estimatedDelivery: {
    minDays: number;
    maxDays: number;
    minDate: string;
    maxDate: string;
  };
  pricing: {
    baseRate: number;
    additionalCharges: number;
    fuelSurcharge: number;
    insurance: number;
    total: number;
    currency: string;
    breakdown: PriceBreakdown[];
  };
}

export interface PriceBreakdown {
  concept: string;
  amount: number;
}

export interface CoverageStats {
  totalZones: number;
  activeZones: number;
  inactiveZones: number;
  comingSoonZones: number;
  totalPostalCodes: number;
  totalServices: number;
  zonesByType: Record<string, number>;
  zonesByStatus: Record<string, number>;
}

@Injectable()
export class CoverageService {
  private readonly logger = new Logger(CoverageService.name);

  constructor(
    @InjectModel(CoverageZone.name)
    private readonly coverageZoneModel: Model<CoverageZone>,
  ) {}

  // ==================== CRUD Operations ====================

  async create(
    organizationId: string,
    dto: CreateCoverageZoneDto,
  ): Promise<CoverageZone> {
    // Validate type-specific requirements
    this.validateZoneData(dto);

    // Check for duplicate code
    const existing = await this.coverageZoneModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      code: dto.code.toUpperCase(),
    });

    if (existing) {
      throw new ConflictException(`Zone with code ${dto.code} already exists`);
    }

    // Create services with generated IDs
    const services = dto.services.map((s) => ({
      ...s,
      _id: new Types.ObjectId(),
    }));

    const zone = new this.coverageZoneModel({
      ...dto,
      organizationId: new Types.ObjectId(organizationId),
      code: dto.code.toUpperCase(),
      services,
    });

    const saved = await zone.save();
    this.logger.log(
      `Created coverage zone ${saved.code} for org ${organizationId}`,
    );
    return saved;
  }

  async findAll(
    organizationId: string,
    query: QueryCoverageZonesDto,
  ): Promise<{
    zones: CoverageZone[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { search, status, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
    };

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { postalCodes: { $in: [search] } },
      ];
    }

    const [zones, total] = await Promise.all([
      this.coverageZoneModel
        .find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.coverageZoneModel.countDocuments(filter),
    ]);

    return {
      zones,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(organizationId: string, id: string): Promise<CoverageZone> {
    const zone = await this.coverageZoneModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!zone) {
      throw new NotFoundException(`Coverage zone ${id} not found`);
    }

    return zone;
  }

  async findByCode(
    organizationId: string,
    code: string,
  ): Promise<CoverageZone> {
    const zone = await this.coverageZoneModel.findOne({
      code: code.toUpperCase(),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!zone) {
      throw new NotFoundException(`Coverage zone with code ${code} not found`);
    }

    return zone;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateCoverageZoneDto,
  ): Promise<CoverageZone> {
    const zone = await this.findById(organizationId, id);

    // If updating services, generate IDs for new ones
    if (dto.services) {
      dto.services = dto.services.map((s) => ({
        ...s,
        _id:
          (s as unknown as { _id?: Types.ObjectId })._id ||
          new Types.ObjectId(),
      })) as unknown as typeof dto.services;
    }

    Object.assign(zone, dto);
    const updated = await zone.save();
    this.logger.log(`Updated coverage zone ${updated.code}`);
    return updated;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const result = await this.coverageZoneModel.deleteOne({
      _id: new Types.ObjectId(id),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Coverage zone ${id} not found`);
    }

    this.logger.log(`Deleted coverage zone ${id}`);
  }

  // ==================== Coverage Check ====================

  async checkCoverage(
    organizationId: string,
    dto: CheckCoverageDto,
  ): Promise<CoverageCheckResult> {
    const { postalCode, coordinates, state, city } = dto;

    if (!postalCode && !coordinates && !state && !city) {
      throw new BadRequestException(
        'At least one of postalCode, coordinates, state, or city is required',
      );
    }

    const filter: Record<string, unknown> = {
      organizationId: new Types.ObjectId(organizationId),
      status: CoverageZoneStatus.ACTIVE,
    };

    // Build query based on input
    const conditions: Record<string, unknown>[] = [];

    if (postalCode) {
      conditions.push({ postalCodes: postalCode });
    }

    if (state) {
      conditions.push({ state: { $regex: state, $options: 'i' } });
    }

    if (city) {
      conditions.push({ city: { $regex: city, $options: 'i' } });
    }

    if (conditions.length > 0) {
      filter.$or = conditions;
    }

    const zones = await this.coverageZoneModel
      .find(filter)
      .sort({ priority: -1 })
      .exec();

    // If using coordinates, filter by radius/polygon
    let filteredZones = zones;
    if (coordinates) {
      filteredZones = zones.filter((zone) => {
        if (
          zone.type === CoverageZoneType.RADIUS &&
          zone.center &&
          zone.radiusKm
        ) {
          return this.isWithinRadius(coordinates, zone.center, zone.radiusKm);
        }
        if (
          zone.type === CoverageZoneType.POLYGON &&
          zone.polygon?.length > 2
        ) {
          return this.isPointInPolygon(coordinates, zone.polygon);
        }
        return true; // Include other zone types
      });
    }

    const isCovered = filteredZones.length > 0;
    const availableServices: AvailableService[] = [];

    for (const zone of filteredZones) {
      for (const service of zone.services) {
        if (service.status === 'active') {
          const estimatedDelivery = this.calculateEstimatedDelivery(
            service.minDeliveryDays,
            service.maxDeliveryDays,
          );

          availableServices.push({
            zone: {
              _id: zone._id.toString(),
              name: zone.name,
              code: zone.code,
            },
            service,
            estimatedDelivery,
            pricing: {
              baseRate:
                service.pricing.baseRate || service.pricing.flatRate || 0,
              additionalCharges: 0,
              fuelSurcharge: 0,
              insurance: 0,
              total: service.pricing.baseRate || service.pricing.flatRate || 0,
              currency: service.pricing.currency,
              breakdown: [
                {
                  concept: 'Tarifa base',
                  amount:
                    service.pricing.baseRate || service.pricing.flatRate || 0,
                },
              ],
            },
          });
        }
      }
    }

    // Sort by price
    availableServices.sort((a, b) => a.pricing.total - b.pricing.total);

    return {
      isCovered,
      zones: filteredZones,
      availableServices,
      restrictions: filteredZones[0]?.restrictedItems,
    };
  }

  async checkPostalCode(
    organizationId: string,
    postalCode: string,
  ): Promise<CoverageCheckResult> {
    return this.checkCoverage(organizationId, { postalCode });
  }

  // ==================== Rate Calculation ====================

  async calculateRate(
    organizationId: string,
    dto: CalculateRateDto,
  ): Promise<AvailableService[]> {
    const {
      destinationPostalCode,
      weight,
      length,
      width,
      height,
      declaredValue,
      includeInsurance,
    } = dto;

    // First check coverage
    const coverage = await this.checkPostalCode(
      organizationId,
      destinationPostalCode,
    );

    if (!coverage.isCovered) {
      return [];
    }

    // Calculate volumetric weight if dimensions provided
    let chargeableWeight = weight;
    if (length && width && height) {
      const volumetricWeight = (length * width * height) / 5000; // Standard factor
      chargeableWeight = Math.max(weight, volumetricWeight);
    }

    // Calculate rates for each service
    const rates: AvailableService[] = [];

    for (const zone of coverage.zones) {
      // Check weight restriction
      if (zone.maxWeight && chargeableWeight > zone.maxWeight) {
        continue;
      }

      // Check dimension restrictions
      if (zone.maxDimensions && length && width && height) {
        if (
          length > zone.maxDimensions.length ||
          width > zone.maxDimensions.width ||
          height > zone.maxDimensions.height
        ) {
          continue;
        }
      }

      for (const service of zone.services) {
        if (service.status !== 'active') continue;

        const pricing = this.calculateServiceRate(
          service,
          chargeableWeight,
          declaredValue,
          includeInsurance,
        );

        const estimatedDelivery = this.calculateEstimatedDelivery(
          service.minDeliveryDays,
          service.maxDeliveryDays,
        );

        rates.push({
          zone: {
            _id: zone._id.toString(),
            name: zone.name,
            code: zone.code,
          },
          service,
          estimatedDelivery,
          pricing,
        });
      }
    }

    // Sort by price
    rates.sort((a, b) => a.pricing.total - b.pricing.total);

    return rates;
  }

  private calculateServiceRate(
    service: ZoneService,
    weight: number,
    declaredValue?: number,
    includeInsurance?: boolean,
  ): AvailableService['pricing'] {
    const { pricing } = service;
    const breakdown: PriceBreakdown[] = [];
    let total = 0;

    // Calculate base rate based on pricing type
    switch (pricing.type) {
      case PricingType.FLAT:
        total = pricing.flatRate || 0;
        breakdown.push({ concept: 'Tarifa fija', amount: total });
        break;

      case PricingType.WEIGHT:
        const baseRate = pricing.baseRate || 0;
        const baseWeight = pricing.baseWeight || 1;
        const additionalPerKg = pricing.additionalPerKg || 0;

        total = baseRate;
        breakdown.push({
          concept: `Tarifa base (hasta ${baseWeight}kg)`,
          amount: baseRate,
        });

        if (weight > baseWeight) {
          const extraWeight = weight - baseWeight;
          const extraCharge = Math.ceil(extraWeight) * additionalPerKg;
          total += extraCharge;
          breakdown.push({
            concept: `Peso adicional (${extraWeight.toFixed(2)}kg × $${additionalPerKg})`,
            amount: extraCharge,
          });
        }
        break;

      case PricingType.VOLUME:
        // For volumetric pricing, weight should already be the greater of actual vs volumetric
        total =
          (pricing.baseRate || 0) + weight * (pricing.additionalPerKg || 0);
        breakdown.push({ concept: 'Tarifa volumétrica', amount: total });
        break;

      case PricingType.DISTANCE:
        // Distance-based would require distance calculation - simplified for now
        total = pricing.minCharge || pricing.baseRate || 0;
        breakdown.push({ concept: 'Tarifa base por distancia', amount: total });
        break;
    }

    // Apply minimum charge
    if (pricing.minCharge && total < pricing.minCharge) {
      const adjustment = pricing.minCharge - total;
      total = pricing.minCharge;
      breakdown.push({ concept: 'Ajuste a cargo mínimo', amount: adjustment });
    }

    // Calculate fuel surcharge
    let fuelSurcharge = 0;
    if (pricing.fuelSurcharge) {
      fuelSurcharge = (total * pricing.fuelSurcharge) / 100;
      total += fuelSurcharge;
      breakdown.push({
        concept: `Recargo combustible (${pricing.fuelSurcharge}%)`,
        amount: fuelSurcharge,
      });
    }

    // Calculate insurance
    let insurance = 0;
    if (includeInsurance && pricing.insuranceRate && declaredValue) {
      insurance = (declaredValue * pricing.insuranceRate) / 100;
      total += insurance;
      breakdown.push({
        concept: `Seguro (${pricing.insuranceRate}% de $${declaredValue})`,
        amount: insurance,
      });
    }

    return {
      baseRate: pricing.baseRate || pricing.flatRate || 0,
      additionalCharges:
        total -
        (pricing.baseRate || pricing.flatRate || 0) -
        fuelSurcharge -
        insurance,
      fuelSurcharge,
      insurance,
      total: Math.round(total * 100) / 100, // Round to 2 decimals
      currency: pricing.currency,
      breakdown,
    };
  }

  // ==================== Postal Codes Management ====================

  async addPostalCodes(
    organizationId: string,
    zoneId: string,
    dto: PostalCodesDto,
  ): Promise<CoverageZone> {
    const zone = await this.findById(organizationId, zoneId);

    if (zone.type !== CoverageZoneType.POSTAL_CODES) {
      throw new BadRequestException('This zone does not support postal codes');
    }

    // Add unique postal codes
    const newCodes = dto.postalCodes.filter(
      (cp) => !zone.postalCodes.includes(cp),
    );
    zone.postalCodes = [...zone.postalCodes, ...newCodes];

    const updated = await zone.save();
    this.logger.log(
      `Added ${newCodes.length} postal codes to zone ${zone.code}`,
    );
    return updated;
  }

  async removePostalCodes(
    organizationId: string,
    zoneId: string,
    dto: PostalCodesDto,
  ): Promise<CoverageZone> {
    const zone = await this.findById(organizationId, zoneId);

    zone.postalCodes = zone.postalCodes.filter(
      (cp) => !dto.postalCodes.includes(cp),
    );

    const updated = await zone.save();
    this.logger.log(
      `Removed ${dto.postalCodes.length} postal codes from zone ${zone.code}`,
    );
    return updated;
  }

  // ==================== Services Management ====================

  async addService(
    organizationId: string,
    zoneId: string,
    serviceDto: CreateCoverageZoneDto['services'][0],
  ): Promise<CoverageZone> {
    const zone = await this.findById(organizationId, zoneId);

    // Check for duplicate service code
    if (zone.services.some((s) => s.code === serviceDto.code)) {
      throw new ConflictException(
        `Service with code ${serviceDto.code} already exists in this zone`,
      );
    }

    zone.services.push({
      ...serviceDto,
      _id: new Types.ObjectId(),
    } as ZoneService);

    const updated = await zone.save();
    this.logger.log(`Added service ${serviceDto.code} to zone ${zone.code}`);
    return updated;
  }

  async updateService(
    organizationId: string,
    zoneId: string,
    serviceId: string,
    serviceDto: Partial<ZoneService>,
  ): Promise<CoverageZone> {
    const zone = await this.findById(organizationId, zoneId);

    const serviceIndex = zone.services.findIndex(
      (s) => s._id.toString() === serviceId,
    );

    if (serviceIndex === -1) {
      throw new NotFoundException(`Service ${serviceId} not found in zone`);
    }

    // Update service properties
    Object.assign(zone.services[serviceIndex], serviceDto);

    const updated = await zone.save();
    this.logger.log(`Updated service ${serviceId} in zone ${zone.code}`);
    return updated;
  }

  async removeService(
    organizationId: string,
    zoneId: string,
    serviceId: string,
  ): Promise<CoverageZone> {
    const zone = await this.findById(organizationId, zoneId);

    const serviceIndex = zone.services.findIndex(
      (s) => s._id.toString() === serviceId,
    );

    if (serviceIndex === -1) {
      throw new NotFoundException(`Service ${serviceId} not found in zone`);
    }

    if (zone.services.length === 1) {
      throw new BadRequestException(
        'Cannot remove the last service from a zone',
      );
    }

    zone.services.splice(serviceIndex, 1);

    const updated = await zone.save();
    this.logger.log(`Removed service ${serviceId} from zone ${zone.code}`);
    return updated;
  }

  // ==================== Statistics ====================

  async getStats(organizationId: string): Promise<CoverageStats> {
    const zones = await this.coverageZoneModel.find({
      organizationId: new Types.ObjectId(organizationId),
    });

    const stats: CoverageStats = {
      totalZones: zones.length,
      activeZones: 0,
      inactiveZones: 0,
      comingSoonZones: 0,
      totalPostalCodes: 0,
      totalServices: 0,
      zonesByType: {},
      zonesByStatus: {},
    };

    const postalCodesSet = new Set<string>();

    for (const zone of zones) {
      // Count by status
      if (zone.status === CoverageZoneStatus.ACTIVE) {
        stats.activeZones++;
      } else if (zone.status === CoverageZoneStatus.INACTIVE) {
        stats.inactiveZones++;
      } else {
        stats.comingSoonZones++;
      }

      // Count by type
      stats.zonesByType[zone.type] = (stats.zonesByType[zone.type] || 0) + 1;

      // Count by status
      stats.zonesByStatus[zone.status] =
        (stats.zonesByStatus[zone.status] || 0) + 1;

      // Count postal codes (unique)
      zone.postalCodes.forEach((cp) => postalCodesSet.add(cp));

      // Count active services
      stats.totalServices += zone.services.filter(
        (s) => s.status === 'active',
      ).length;
    }

    stats.totalPostalCodes = postalCodesSet.size;

    return stats;
  }

  // ==================== Bulk Operations ====================

  async bulkUpdateStatus(
    organizationId: string,
    dto: BulkStatusUpdateDto,
  ): Promise<{ updated: number }> {
    const result = await this.coverageZoneModel.updateMany(
      {
        _id: { $in: dto.zoneIds.map((id) => new Types.ObjectId(id)) },
        organizationId: new Types.ObjectId(organizationId),
      },
      { $set: { status: dto.status } },
    );

    this.logger.log(
      `Bulk updated ${result.modifiedCount} zones to status ${dto.status}`,
    );
    return { updated: result.modifiedCount };
  }

  // ==================== Helper Methods ====================

  private validateZoneData(dto: CreateCoverageZoneDto): void {
    switch (dto.type) {
      case CoverageZoneType.POSTAL_CODES:
        if (!dto.postalCodes || dto.postalCodes.length === 0) {
          throw new BadRequestException(
            'Postal codes are required for postal_codes zone type',
          );
        }
        break;
      case CoverageZoneType.RADIUS:
        if (!dto.center || !dto.radiusKm) {
          throw new BadRequestException(
            'Center coordinates and radius are required for radius zone type',
          );
        }
        break;
      case CoverageZoneType.POLYGON:
        if (!dto.polygon || dto.polygon.length < 3) {
          throw new BadRequestException(
            'At least 3 polygon points are required for polygon zone type',
          );
        }
        break;
      case CoverageZoneType.STATE:
        if (!dto.state) {
          throw new BadRequestException(
            'State is required for state zone type',
          );
        }
        break;
      case CoverageZoneType.CITY:
        if (!dto.city) {
          throw new BadRequestException('City is required for city zone type');
        }
        break;
    }
  }

  private calculateEstimatedDelivery(
    minDays: number,
    maxDays: number,
  ): AvailableService['estimatedDelivery'] {
    const now = new Date();
    const minDate = new Date(now);
    const maxDate = new Date(now);

    // Add business days (skip weekends)
    let daysToAdd = minDays;
    while (daysToAdd > 0) {
      minDate.setDate(minDate.getDate() + 1);
      if (minDate.getDay() !== 0 && minDate.getDay() !== 6) {
        daysToAdd--;
      }
    }

    daysToAdd = maxDays;
    while (daysToAdd > 0) {
      maxDate.setDate(maxDate.getDate() + 1);
      if (maxDate.getDay() !== 0 && maxDate.getDay() !== 6) {
        daysToAdd--;
      }
    }

    return {
      minDays,
      maxDays,
      minDate: minDate.toISOString().split('T')[0],
      maxDate: maxDate.toISOString().split('T')[0],
    };
  }

  private isWithinRadius(
    point: { lat: number; lng: number },
    center: { lat: number; lng: number },
    radiusKm: number,
  ): boolean {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point.lat - center.lat);
    const dLng = this.toRad(point.lng - center.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(center.lat)) *
        Math.cos(this.toRad(point.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusKm;
  }

  private isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: { lat: number; lng: number }[],
  ): boolean {
    // Ray casting algorithm
    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
