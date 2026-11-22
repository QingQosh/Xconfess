import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserCollection } from './entities/user-collection.entity';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  ReorderCollectionsDto,
} from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    @InjectRepository(UserCollection)
    private readonly collectionRepo: Repository<UserCollection>,
    private readonly dataSource: DataSource,
  ) {}

  async createCollection(
    userId: number,
    dto: CreateCollectionDto,
  ): Promise<UserCollection> {
    const highestOrder = await this.collectionRepo
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })
      .select('MAX(c.display_order)', 'maxOrder')
      .getRawOne();

    const nextOrder = (highestOrder?.maxOrder ?? -1) + 1;

    const collection = this.collectionRepo.create({
      userId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      displayOrder: nextOrder,
      isPrivate: dto.isPrivate ?? true,
      version: 1,
    });

    return this.collectionRepo.save(collection);
  }

  async getCollections(userId: number): Promise<UserCollection[]> {
    return this.collectionRepo.find({
      where: { userId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getCollectionById(userId: number, id: string): Promise<UserCollection> {
    const collection = await this.collectionRepo.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException({
        code: 'COLLECTION_NOT_FOUND',
        message: `Collection ${id} not found`,
      });
    }

    if (collection.userId !== userId) {
      throw new ForbiddenException({
        code: 'COLLECTION_ACCESS_DENIED',
        message: 'You are not authorized to access this private collection',
      });
    }

    return collection;
  }

  async updateCollection(
    userId: number,
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<UserCollection> {
    const collection = await this.getCollectionById(userId, id);

    // Optimistic concurrency check
    if (
      dto.expectedVersion !== undefined &&
      dto.expectedVersion !== collection.version
    ) {
      throw new ConflictException({
        code: 'COLLECTION_CONCURRENCY_CONFLICT',
        message:
          'Collection has been updated by another operation. Refresh and retry.',
        currentVersion: collection.version,
        expectedVersion: dto.expectedVersion,
      });
    }

    if (dto.name !== undefined) collection.name = dto.name.trim();
    if (dto.description !== undefined)
      collection.description = dto.description?.trim();
    if (dto.isPrivate !== undefined) collection.isPrivate = dto.isPrivate;

    return this.collectionRepo.save(collection);
  }

  async reorderCollections(
    userId: number,
    dto: ReorderCollectionsDto,
  ): Promise<UserCollection[]> {
    const userCollections = await this.getCollections(userId);
    const existingMap = new Map(userCollections.map((c) => [c.id, c]));

    // Validate that all supplied IDs belong to caller
    for (const id of dto.collectionIds) {
      if (!existingMap.has(id)) {
        throw new NotFoundException({
          code: 'COLLECTION_NOT_FOUND',
          message: `Collection ${id} not found or not owned by user`,
        });
      }
    }

    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < dto.collectionIds.length; i++) {
        const id = dto.collectionIds[i];
        await manager.update(UserCollection, { id, userId }, { displayOrder: i });
      }
    });

    return this.getCollections(userId);
  }

  async deleteCollection(userId: number, id: string): Promise<void> {
    const collection = await this.getCollectionById(userId, id);
    await this.collectionRepo.remove(collection);
  }
}
