import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BulkReadService } from './bulk-read.service';
import { BadRequestException } from '@nestjs/common';

describe('BulkReadService', () => {
  let service: BulkReadService;
  let dataSource: any;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkReadService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<BulkReadService>(BulkReadService);
  });

  it('should reject requests exceeding batch bound limit of 50', async () => {
    const oversizedIds = Array.from({ length: 55 }, (_, i) => `id-${i}`);
    await expect(
      service.executeBulkRead(1, {
        resourceType: 'confessions',
        ids: oversizedIds,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should preserve input-to-result mapping with per-item status and error codes', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ id: 'c-1', user_id: 1, name: 'Owned Collection' }])
      .mockResolvedValueOnce([]) // not found
      .mockResolvedValueOnce([{ id: 'c-3', user_id: 999, name: 'Other User Collection' }]); // forbidden

    const response = await service.executeBulkRead(1, {
      resourceType: 'collections',
      ids: ['c-1', 'c-2', 'c-3'],
    });

    expect(response.totalRequested).toBe(3);
    expect(response.successCount).toBe(1);
    expect(response.failureCount).toBe(2);

    expect(response.results[0]).toEqual({
      id: 'c-1',
      status: 'SUCCESS',
      statusCode: 200,
      data: expect.objectContaining({ name: 'Owned Collection' }),
    });

    expect(response.results[1]).toEqual({
      id: 'c-2',
      status: 'NOT_FOUND',
      statusCode: 404,
      error: 'collections record not found',
    });

    expect(response.results[2]).toEqual({
      id: 'c-3',
      status: 'FORBIDDEN',
      statusCode: 403,
      error: 'You do not have authorization to view this resource',
    });
  });
});
