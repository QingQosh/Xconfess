import { AsyncLocalStorage } from 'async_hooks';
import { EntityManager } from 'typeorm';

export class RequestTransactionContext {
  private static readonly storage = new AsyncLocalStorage<EntityManager>();

  static run<T>(manager: EntityManager, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, fn);
  }

  static getEntityManager(): EntityManager | undefined {
    return this.storage.getStore();
  }

  static hasActiveTransaction(): boolean {
    return !!this.storage.getStore();
  }
}
