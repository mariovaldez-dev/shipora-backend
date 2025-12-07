/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { type IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { User as DomainUser } from '@users/domain/entities/user.entity';
import { UserDocument } from '../schema/user.schema';
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: DomainUser): Promise<DomainUser> {
    const data = new this.userModel(user.toPrimitives());
    const saved = await data.save();
    return DomainUser.fromPrimitives(saved);
  }

  async findById(id: string): Promise<DomainUser | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? DomainUser.fromPrimitives(user) : null;
  }

  async findByEmail(email: string): Promise<DomainUser | null> {
    const user = await this.userModel.findOne({ email }).exec();
    return user ? DomainUser.fromPrimitives(user) : null;
  }

  async findAll(): Promise<DomainUser[]> {
    const users = await this.userModel.find().exec();
    return users.map((u) => DomainUser.fromPrimitives(u));
  }

  async update(id: string, entity: Partial<DomainUser>): Promise<DomainUser> {
    const updated = await this.userModel
      .findByIdAndUpdate(id, entity, { new: true })
      .exec();

    if (!updated) throw new Error('User not found');

    return DomainUser.fromPrimitives(updated);
  }

  async delete(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }
}
