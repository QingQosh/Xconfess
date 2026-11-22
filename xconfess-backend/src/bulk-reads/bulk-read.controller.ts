import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BulkReadService } from './bulk-read.service';
import { BulkReadRequestDto } from './dto/bulk-read-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequestCost, COST } from '../common/guards/cost-throttler.guard';

@Controller('bulk-reads')
@UseGuards(JwtAuthGuard)
export class BulkReadController {
  constructor(private readonly bulkReadService: BulkReadService) {}

  @Post()
  @RequestCost(COST.MEDIUM)
  async readBatch(@Request() req: any, @Body() dto: BulkReadRequestDto) {
    return this.bulkReadService.executeBulkRead(req.user.id, dto);
  }
}
