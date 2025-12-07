import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface';
import { Organization } from '../../../domain/entities/organization.entity';

interface OrganizationDocument {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  ownerId: string;
  settings: Record<string, unknown>;
  billing: Record<string, unknown>;
  isActive: boolean;
  allowedDomains: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  constructor(
    @InjectModel('Organization')
    private readonly model: Model<OrganizationDocument>,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<Organization[]> {
    const docs = await this.model.find().lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const doc = await this.model.findOne({ slug }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Organization[]> {
    const docs = await this.model.find({ ownerId }).lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.model.countDocuments({ slug }).exec();
    return count > 0;
  }

  async create(entity: Organization): Promise<Organization> {
    const doc = await this.model.create({
      _id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      logo: entity.logo,
      website: entity.website,
      ownerId: entity.ownerId,
      settings: entity.settings,
      billing: entity.billing,
      isActive: entity.isActive,
      allowedDomains: entity.allowedDomains,
      metadata: entity.metadata,
    });
    return this.toDomain(doc.toObject());
  }

  async update(
    id: string,
    entity: Partial<Organization>,
  ): Promise<Organization> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: entity }, { new: true })
      .lean()
      .exec();
    return this.toDomain(doc!);
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  private toDomain(doc: OrganizationDocument): Organization {
    return new Organization({
      id: doc._id,
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      logo: doc.logo,
      website: doc.website,
      ownerId: doc.ownerId,
      settings: doc.settings as unknown as Organization['settings'],
      billing: doc.billing as unknown as Organization['billing'],
      isActive: doc.isActive,
      allowedDomains: doc.allowedDomains,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
