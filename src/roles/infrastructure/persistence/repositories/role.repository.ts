/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRoleRepository } from '@roles/domain/repositories/role.repository.interface';
import { Permission, Role } from '@roles/domain/entities/role.entity';
import { RoleDocument } from '../schema/role.schema';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(
    @InjectModel(RoleDocument.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    const doc = await this.roleModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const doc = await this.roleModel.findOne({ name }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<Role[]> {
    const docs = await this.roleModel.find().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async create(entity: Role): Promise<Role> {
    try {
      const doc = new this.roleModel({
        name: entity.name,
        description: entity.description,
        permissions: entity.permissions,
      });

      await doc.save();
      return this.toDomain(doc);
    } catch (err) {
      console.error('Mongo error:', err);
      throw new Error('Error creating Role');
    }
  }

  async update(id: string, partial: Partial<Role>): Promise<Role> {
    const doc = await this.roleModel
      .findByIdAndUpdate(
        id,
        {
          ...(partial.name && { name: partial.name }),
          ...(partial.description && { description: partial.description }),
          ...(partial.permissions && { permissions: partial.permissions }),
        },
        { new: true },
      )
      .exec();

    if (!doc) throw new Error('Role not found');

    return this.toDomain(doc);
  }

  async delete(id: string): Promise<void> {
    await this.roleModel.findByIdAndDelete(id).exec();
  }

  private toDomain(doc: RoleDocument): Role {
    return new Role({
      name: doc.name,
      description: doc.description,
      permissions: doc.permissions.map((p) => p as Permission),
    });
  }
}
