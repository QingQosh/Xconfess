import { Module } from '@nestjs/common';
import { BulkReadService } from './bulk-read.service';
import { BulkReadController } from './bulk-read.controller';

@Module({
  controllers: [BulkReadController],
  providers: [BulkReadService],
  exports: [BulkReadService],
})
export class BulkReadModule {}
