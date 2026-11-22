import {
  IsArray,
  IsNotEmpty,
  IsString,
  ArrayMaxSize,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';

export class BulkReadRequestDto {
  @IsString()
  @IsIn(['confessions', 'collections', 'bookmarks'])
  resourceType: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50, {
    message: 'Batch read exceeds maximum bound of 50 items',
  })
  @IsString({ each: true })
  ids: string[];
}
