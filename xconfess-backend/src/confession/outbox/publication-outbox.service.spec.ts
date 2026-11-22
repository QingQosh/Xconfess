import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublicationOutboxService } from './publication-outbox.service';
import {
  PublicationOutboxEvent,
  PublicationEventType,
  PublicationOutboxStatus,
} from './entities/publication-outbox-event.entity';

describe('PublicationOutboxService', () => {
  let service: PublicationOutboxService;
  let outboxRepo: any;
  let eventEmitter: any;

  beforeEach(async () => {
    outboxRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'outbox-1' })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      find: jest.fn().mockResolvedValue([]),
    };

    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicationOutboxService,
        { provide: getRepositoryToken(PublicationOutboxEvent), useValue: outboxRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PublicationOutboxService>(PublicationOutboxService);
  });

  it('persists publication state and domain event in same transaction with deduplication', async () => {
    const mockManager: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((cls, d) => ({ ...d, id: 'outbox-1' })),
      save: jest.fn().mockImplementation((cls, e) => Promise.resolve(e)),
    };

    const event = await service.persistOutboxEvent(
      mockManager,
      'conf-uuid-1',
      PublicationEventType.PUBLICATION_SCHEDULED,
      { publishAt: '2026-12-01' },
    );

    expect(event.dedupKey).toBe('pub-outbox:conf-uuid-1:PUBLICATION_SCHEDULED');
    expect(mockManager.save).toHaveBeenCalled();
  });

  it('moves event to DEAD_LETTER when maximum retries are exceeded', async () => {
    const failedEvent = {
      id: 'e-1',
      confessionId: 'c-1',
      eventType: PublicationEventType.PUBLICATION_PUBLISHED,
      payload: {},
      status: PublicationOutboxStatus.PENDING,
      attempts: 4,
      maxAttempts: 5,
    };

    outboxRepo.find.mockResolvedValueOnce([failedEvent]);
    eventEmitter.emitAsync.mockRejectedValueOnce(new Error('Fatal queue disconnect'));

    await service.dispatchPendingBatch(10);

    expect(outboxRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PublicationOutboxStatus.DEAD_LETTER,
        attempts: 5,
      }),
    );
  });
});
