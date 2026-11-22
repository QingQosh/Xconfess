import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsConsentRecord } from './entities/analytics-consent-record.entity';
import { RecordConsentDto } from './dto/record-consent.dto';

@Injectable()
export class AnalyticsConsentService {
  private readonly logger = new Logger(AnalyticsConsentService.name);

  constructor(
    @InjectRepository(AnalyticsConsentRecord)
    private readonly consentRepo: Repository<AnalyticsConsentRecord>,
  ) {}

  async recordConsent(
    userId: number,
    dto: RecordConsentDto,
  ): Promise<AnalyticsConsentRecord> {
    let record = await this.consentRepo.findOne({
      where: { userId, policyVersion: dto.policyVersion },
    });

    if (record) {
      record.consentGiven = dto.consentGiven;
      record.withdrawnAt = dto.consentGiven ? undefined : new Date();
    } else {
      record = this.consentRepo.create({
        userId,
        policyVersion: dto.policyVersion,
        consentGiven: dto.consentGiven,
        withdrawnAt: dto.consentGiven ? undefined : new Date(),
      });
    }

    const saved = await this.consentRepo.save(record);
    this.logger.log(
      `[CONSENT] Recorded analytics consent: user=${userId} version=${dto.policyVersion} given=${dto.consentGiven}`,
    );
    return saved;
  }

  async withdrawConsent(userId: number): Promise<void> {
    const records = await this.consentRepo.find({ where: { userId } });
    const now = new Date();
    for (const r of records) {
      r.consentGiven = false;
      r.withdrawnAt = now;
      await this.consentRepo.save(r);
    }
    this.logger.log(`[CONSENT] Withdrew all analytics consent for user=${userId}`);
  }

  async hasActiveConsent(userId: number, policyVersion?: string): Promise<boolean> {
    const query: any = { userId, consentGiven: true };
    if (policyVersion) {
      query.policyVersion = policyVersion;
    }

    const active = await this.consentRepo.findOne({
      where: query,
      order: { createdAt: 'DESC' },
    });

    return !!active && !active.withdrawnAt;
  }
}
