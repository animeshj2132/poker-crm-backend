import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './user.entity';
import { Club } from '../clubs/club.entity';
import { ClubRole } from '../common/rbac/roles';

@Entity({ name: 'user_club_roles' })
@Unique(['user', 'club', 'role'])
export class UserClubRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.clubRoles, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Club, (club) => club.userRoles, { nullable: false })
  @JoinColumn({ name: 'club_id' })
  club!: Club;

  @Column({ type: 'varchar' })
  role!: ClubRole;
}



