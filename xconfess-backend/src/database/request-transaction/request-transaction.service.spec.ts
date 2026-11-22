import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RequestTransactionService } from './request-transaction.service';
import { RequestTransactionContext } from './request-transaction-context';

describe('RequestTransactionService (Issue #401)', () => {
  let service: RequestTransactionService;
  let queryRunner: any;
  let dataSource: any;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockResolvedValue({ id: 'saved-1' }),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      manager: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestTransactionService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RequestTransactionService>(RequestTransactionService);
  });

  it('commits transaction atomically when all writes succeed', async () => {
    const result = await service.executeInTransaction(async (manager) => {
      expect(RequestTransactionContext.hasActiveTransaction()).toBe(true);
      return { success: true };
    });

    expect(result.success).toBe(true);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('rolls back transaction completely when a downstream write fails', async () => {
    await expect(
      service.executeInTransaction(async (manager) => {
        throw new Error('Downstream foreign key violation');
      }),
    ).rejects.toThrow('Downstream foreign key violation');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });
});
