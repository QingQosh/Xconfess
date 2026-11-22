import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RequestTransactionContext } from './request-transaction-context';

@Injectable()
export class RequestTransactionService {
  private readonly logger = new Logger(RequestTransactionService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Executes multiple service writes inside a request-scoped database transaction.
   * If a transaction is already active in the async context, reuses it.
   * If not, establishes an isolated transaction boundary with automatic rollback on error.
   */
  async executeInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const activeManager = RequestTransactionContext.getEntityManager();
    if (activeManager) {
      // Re-use current transaction context without widening scope
      return work(activeManager);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await RequestTransactionContext.run(
        queryRunner.manager,
        async () => {
          return await work(queryRunner.manager);
        },
      );

      await queryRunner.commitTransaction();
      return result;
    } catch (err: any) {
      this.logger.warn(
        `Rolling back request transaction due to downstream failure: ${err.message}`,
      );
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  getCurrentManager(): EntityManager {
    return RequestTransactionContext.getEntityManager() || this.dataSource.manager;
  }
}
