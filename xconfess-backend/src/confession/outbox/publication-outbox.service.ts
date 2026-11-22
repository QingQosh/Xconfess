import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PublicationOutboxEvent,
  PublicationEventType,
  PublicationOutboxStatus,
} from './entities/publication-outbox-event.entity';

@Injectable()
export class PublicationOutboxService {
  private readonly logger = new Logger(PublicationOutboxService.name);

  constructor(
    @InjectRepository(PublicationOutboxEvent)
    private readonly outboxRepo: Repository<PublicationOutboxEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  generateDedupKey(confessionId: string, eventType: PublicationEventType): string {
    return `pub-outbox:${confessionId}:${eventType}`;
  }

  async persistOutboxEvent(
    manager: EntityManager,
    confessionId: string,
    eventType: PublicationEventType,
    payload: Record<string, any>,
  ): Promise<PublicationOutboxEvent> {
    const dedupKey = this.generateDedupKey(confessionId, eventType);

    const existing = await manager.findOne(PublicationOutboxEvent, {
      where: { dedupKey },
    });
    if (existing) {
      return existing;
    }

    const event = manager.create(PublicationOutboxEvent, {
      confessionId,
      eventType,
      payload,
      dedupKey,
      status: PublicationOutboxStatus.PENDING,
      checkpointSeq: Date.now(),
      attempts: 0,
      maxAttempts: 5,
    });

    return manager.save(PublicationOutboxEvent, event);
  }

  async dispatchPendingBatch(batchSize = 25): Promise<number> {
    const pending = await this.outboxRepo.find({
      where: { status: PublicationOutboxStatus.PENDING },
      order: { checkpointSeq: 'ASC', createdAt: 'ASC' },
      take: batchSize,
    });

    let deliveredCount = 0;

    for (const event of pending) {
      event.attempts += 1;
      try {
        await this.eventEmitter.emitAsync(`publication.${event.eventType.toLowerCase()}`, {
          confessionId: event.confessionId,
          ...event.payload,
        });

        event.status = PublicationOutboxStatus.DELIVERED;
        event.deliveredAt = new Date();
        event.lastError = undefined;
        deliveredCount++;
      } catch (err: any) {
        event.lastError = err.message || 'Dispatch failure';
        if (event.attempts >= event.maxAttempts) {
          event.status = PublicationOutboxStatus.DEAD_LETTER;
          this.logger.error(
            `Publication outbox event ${event.id} moved to DEAD_LETTER: ${err.message}`,
          );
        }
      }
      await this.outboxRepo.save(event);
    }

    return deliveredCount;
  }
}
