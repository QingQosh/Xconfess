import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConsentWithdrawalPropagationService } from './consent-withdrawal-propagation.service';

describe('ConsentWithdrawalPropagationService', () => {
  let service: ConsentWithdrawalPropagationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsentWithdrawalPropagationService],
    }).compile();

    service = module.get<ConsentWithdrawalPropagationService>(
      ConsentWithdrawalPropagationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should propagate consent withdrawal with verifiable completion and preserve account', async () => {
    const userId = 'usr-privacy-999';
    const audit = await service.propagateConsentWithdrawal(userId, 'Revoking all analytics cookies');

    expect(audit).toBeDefined();
    expect(audit.userId).toEqual(userId);
    expect(audit.status).toEqual('COMPLETED');
    expect(audit.accountPreserved).toBe(true);
    expect(audit.completedAt).toBeDefined();

    // Verify all stages completed successfully
    expect(audit.stages.length).toBe(4);
    for (const stage of audit.stages) {
      expect(stage.status).toEqual('SUCCESS');
      expect(stage.completedAt).not.toBeNull();
    }

    // Verify actor is now blocked from ingestion
    expect(service.isActorBlockedFromAnalytics(userId)).toBe(true);
  });

  it('should reject empty userId', async () => {
    await expect(service.propagateConsentWithdrawal('')).rejects.toThrow(BadRequestException);
  });

  it('should allow querying withdrawal status by id', async () => {
    const userId = 'usr-status-check';
    const audit = await service.propagateConsentWithdrawal(userId);

    const fetched = await service.getWithdrawalStatus(audit.withdrawalId);
    expect(fetched.withdrawalId).toEqual(audit.withdrawalId);
    expect(fetched.userId).toEqual(userId);
  });

  it('should throw NotFoundException on non-existent withdrawalId', async () => {
    await expect(service.getWithdrawalStatus('non-existent-id')).rejects.toThrow(NotFoundException);
  });
});
