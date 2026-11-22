import { IsArray, IsUUID, ArrayMaxSize, ArrayNotEmpty } from 'class-validator';

export class BulkDeleteCollectionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(25, {
    message: 'Bulk deletion batch is bounded to a maximum of 25 collections per request',
  })
  @IsUUID('4', { each: true })
  collectionIds: string[];
}
