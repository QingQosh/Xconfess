import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CollectionsService } from './collections.service';
import { UserCollection } from './entities/user-collection.entity';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CollectionsService', () => {
  let service: CollectionsService;
  let collectionRepo: any;
  let dataSource: any;

  const mockCollection: UserCollection = {
    id: 'col-1',
    userId: 5,
    name: 'Favorite Confessions',
    description: 'Personal favorites',
    displayOrder: 0,
    isPrivate: true,
    version: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    collectionRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'col-1' })),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      findOne: jest.fn().mockResolvedValue(mockCollection),
      find: jest.fn().mockResolvedValue([mockCollection]),
      remove: jest.fn().mockResolvedValue(mockCollection),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxOrder: 2 }),
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb({ update: jest.fn().mockResolvedValue(undefined) })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: getRepositoryToken(UserCollection), useValue: collectionRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CollectionsService>(CollectionsService);
  });

  it('should create private collection with incremental displayOrder', async () => {
    const res = await service.createCollection(5, { name: 'Reflections' });
    expect(res.displayOrder).toBe(3);
    expect(res.isPrivate).toBe(true);
    expect(collectionRepo.save).toHaveBeenCalled();
  });

  it('should enforce optimistic concurrency checks on updates', async () => {
    collectionRepo.findOne.mockResolvedValueOnce(mockCollection); // version is 2

    await expect(
      service.updateCollection(5, 'col-1', {
        name: 'New Name',
        expectedVersion: 1, // outdated version
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should prevent access to other users collections', async () => {
    collectionRepo.findOne.mockResolvedValueOnce({
      ...mockCollection,
      userId: 999,
    });

    await expect(service.getCollectionById(5, 'col-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
