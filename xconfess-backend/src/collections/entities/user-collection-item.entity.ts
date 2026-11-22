import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserCollection } from './user-collection.entity';

@Entity('user_collection_items')
@Index(['collectionId', 'confessionId'], { unique: true })
export class UserCollectionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'collection_id', type: 'uuid' })
  @Index()
  collectionId: string;

  @ManyToOne(() => UserCollection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collection_id' })
  collection: UserCollection;

  @Column({ name: 'confession_id', type: 'uuid' })
  @Index()
  confessionId: string;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
