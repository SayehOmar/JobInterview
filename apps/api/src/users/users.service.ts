import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@forest/database';
import { MapStateInput } from './dto/map-state.input';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async updateMapState(userId: string, input: MapStateInput): Promise<User> {
        const merged: Record<string, any> = {
            ...(input.filters ? (input.filters as Record<string, any>) : {}),
        };
        if (input.activeLayers !== undefined) {
            merged.activeLayers = input.activeLayers;
        }

        await this.userRepository.update(userId, {
            lastLng: input.lng,
            lastLat: input.lat,
            lastZoom: input.zoom,
            lastFilters: Object.keys(merged).length ? merged : undefined,
        });

        const user = await this.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}