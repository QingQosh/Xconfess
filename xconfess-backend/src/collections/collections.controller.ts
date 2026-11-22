import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  ReorderCollectionsDto,
} from './dto/collection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Collections')
@ApiBearerAuth()
@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a private user collection' })
  @ApiResponse({ status: 201, description: 'Collection created successfully.' })
  async createCollection(
    @Request() req: any,
    @Body() dto: CreateCollectionDto,
  ) {
    return this.collectionsService.createCollection(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List user-owned collections ordered by display preference' })
  @ApiResponse({ status: 200, description: 'User collections.' })
  async getCollections(@Request() req: any) {
    return this.collectionsService.getCollections(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single collection by ID' })
  @ApiResponse({ status: 200, description: 'Collection details.' })
  @ApiResponse({ status: 403, description: 'Unauthorized access.' })
  @ApiResponse({ status: 404, description: 'Collection not found.' })
  async getCollection(@Request() req: any, @Param('id') id: string) {
    return this.collectionsService.getCollectionById(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update collection metadata or privacy with concurrency versioning' })
  @ApiResponse({ status: 200, description: 'Collection updated.' })
  @ApiResponse({ status: 409, description: 'Concurrency conflict.' })
  async updateCollection(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.updateCollection(req.user.id, id, dto);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder user collections transactionally' })
  @ApiResponse({ status: 200, description: 'Reordered collection list.' })
  async reorderCollections(
    @Request() req: any,
    @Body() dto: ReorderCollectionsDto,
  ) {
    return this.collectionsService.reorderCollections(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user collection' })
  @ApiResponse({ status: 204, description: 'Collection deleted.' })
  async deleteCollection(@Request() req: any, @Param('id') id: string) {
    return this.collectionsService.deleteCollection(req.user.id, id);
  }
}
