import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataTransparencyService, AUTHORITATIVE_RETENTION_POLICIES } from './data-transparency.service';

describe('DataTransparencyService', () => {
  let service: DataTransparencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataTransparencyService],
    }).compile();

    service = module.get<DataTransparencyService>(DataTransparencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a transparency panel report using authoritative metadata', async () => {
    const userId = 'user-uuid-123';
    const report = await service.getTransparencyPanel(userId);

    expect(report).toBeDefined();
    expect(report.userId).toEqual(userId);
    expect(report.policyVersion).toBeDefined();
    expect(report.categories.length).toBeGreaterThan(0);

    const profileCat = report.categories.find((c) => c.category === 'ACCOUNT_PROFILE');
    expect(profileCat).toBeDefined();
    expect(profileCat?.policy.legalBasis).toEqual('CONTRACT');
    expect(profileCat?.availableControls).toContain('EXPORT');
  });

  it('should throw NotFoundException if userId is empty', async () => {
    await expect(service.getTransparencyPanel('')).rejects.toThrow(NotFoundException);
  });

  it('should include correct controls based on category policy', async () => {
    const report = await service.getTransparencyPanel('user-test');
    const analytics = report.categories.find((c) => c.category === 'ENGAGEMENT_ANALYTICS');
    expect(analytics).toBeDefined();
    expect(analytics?.policy.legalBasis).toBe('CONSENT');
    expect(analytics?.availableControls).toContain('DELETE');
    expect(analytics?.availableControls).toContain('UPDATE_PREFERENCES');
  });
});
