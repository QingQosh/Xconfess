import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsConsentService } from './analytics-consent.service';
import { AnalyticsConsentRecord } from './entities/analytics-consent-record.entity';

describe('AnalyticsConsentService - Versioned Consent Management (Issue #402)', () => {
  let service: AnalyticsConsentService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((d) => ({ ...d, id: 'consent-1' })),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsConsentService,
        { provide: getRepositoryToken(AnalyticsConsentRecord), useValue: repo },
      ],
    }).compile();

    service = module.get<AnalyticsConsentService>(AnalyticsConsentService);
  });

  it('records versioned consent without blocking user flow on refusal', async () => {
    repo.findOne.mockResolvedValueOnce(null);

    const refusalRecord = await service.recordConsent(10, {
      policyVersion: '2026.11-v1',
      consentGiven: false,
    });

    expect(refusalRecord.consentGiven).toBe(false);
    expect(refusalRecord.policyVersion).toBe('2026.11-v1');
    expect(refusalRecord.withdrawnAt).toBeInstanceOf(Date);
    expect(repo.save).toHaveBeenCalled();
  });

  it('stops optional event collection after consent withdrawal', async () => {
    repo.find.mockResolvedValueOnce([
      { id: 'c-1', userId: 10, consentGiven: true, withdrawnAt: null },
    ]);

    await service.withdrawConsent(10);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        consentGiven: false,
        withdrawnAt: expect.any(Date),
      }),
    );
  });

  it('verifies active consent check returns true only when granted and not withdrawn', async () => {
    repo.findOne.mockResolvedValueOnce({
      id: 'c-1',
      userId: 10,
      consentGiven: true,
      withdrawnAt: null,
    });

    const hasConsent = await service.hasActiveConsent(10, '2026.11-v1');
    expect(hasConsent).toBe(true);

    repo.findOne.mockResolvedValueOnce({
      id: 'c-2',
      userId: 10,
      consentGiven: true,
      withdrawnAt: new Date(),
    });

    const withdrawnConsent = await service.hasActiveConsent(10, '2026.11-v1');
    expect(withdrawnConsent).toBe(false);
  });
});
