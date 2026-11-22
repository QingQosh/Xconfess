import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BulkReadRequestDto } from './dto/bulk-read-request.dto';

export interface BulkItemResult<T = any> {
  id: string;
  status: 'SUCCESS' | 'NOT_FOUND' | 'FORBIDDEN';
  statusCode: number;
  data?: T;
  error?: string;
}

export interface BulkReadResponse<T = any> {
  resourceType: string;
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BulkItemResult<T>[];
}

@Injectable()
export class BulkReadService {
  private readonly logger = new Logger(BulkReadService.name);
  private readonly MAX_BATCH_LIMIT = 50;

  constructor(private readonly dataSource: DataSource) {}

  async executeBulkRead(
    userId: number,
    dto: BulkReadRequestDto,
  ): Promise<BulkReadResponse> {
    if (dto.ids.length > this.MAX_BATCH_LIMIT) {
      throw new BadRequestException({
        code: 'MAX_BATCH_SIZE_EXCEEDED',
        message: `Bulk read request exceeds maximum allowed batch limit of ${this.MAX_BATCH_LIMIT} items`,
        requestedCount: dto.ids.length,
        maxLimit: this.MAX_BATCH_LIMIT,
      });
    }

    const results: BulkItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Preserve exact input ordering
    for (const id of dto.ids) {
      try {
        const item = await this.fetchAndAuthorize(userId, dto.resourceType, id);
        if (!item) {
          results.push({
            id,
            status: 'NOT_FOUND',
            statusCode: 404,
            error: `${dto.resourceType} record not found`,
          });
          failureCount++;
        } else if (item.isForbidden) {
          results.push({
            id,
            status: 'FORBIDDEN',
            statusCode: 403,
            error: 'You do not have authorization to view this resource',
          });
          failureCount++;
        } else {
          results.push({
            id,
            status: 'SUCCESS',
            statusCode: 200,
            data: item.data,
          });
          successCount++;
        }
      } catch (err: any) {
        results.push({
          id,
          status: 'NOT_FOUND',
          statusCode: 404,
          error: err.message || 'Error retrieving item',
        });
        failureCount++;
      }
    }

    return {
      resourceType: dto.resourceType,
      totalRequested: dto.ids.length,
      successCount,
      failureCount,
      results,
    };
  }

  private async fetchAndAuthorize(
    userId: number,
    resourceType: string,
    id: string,
  ): Promise<{ data?: any; isForbidden?: boolean } | null> {
    if (resourceType === 'collections') {
      const row = await this.dataSource.query(
        'SELECT * FROM user_collections WHERE id = $1',
        [id],
      );
      if (!row || row.length === 0) return null;
      if (row[0].user_id !== userId) return { isForbidden: true };
      return { data: row[0] };
    }

    if (resourceType === 'bookmarks') {
      const row = await this.dataSource.query(
        'SELECT * FROM bookmarks WHERE id = $1',
        [id],
      );
      if (!row || row.length === 0) return null;
      if (row[0].userId !== userId && row[0].user_id !== userId) {
        return { isForbidden: true };
      }
      return { data: row[0] };
    }

    // Default: confessions
    const row = await this.dataSource.query(
      'SELECT id, message, created_at, is_deleted, view_count FROM anonymous_confessions WHERE id = $1 AND is_deleted = false',
      [id],
    );
    if (!row || row.length === 0) return null;
    return { data: row[0] };
  }
}
