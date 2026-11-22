import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class RecordConsentDto {
  @IsString()
  @IsNotEmpty()
  policyVersion: string;

  @IsBoolean()
  consentGiven: boolean;
}
