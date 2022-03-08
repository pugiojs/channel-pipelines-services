import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
@Index(['createdAt', 'id'])
export class UserDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({ name: 'open_id' })
    public openId: string;

    @Column()
    public email: string;

    @Column()
    public picture: string;

    @Column({ name: 'full_name', nullable: true })
    public fullName: string;

    @Column({ name: 'first_name', nullable: true })
    public firstName: string;

    @Column({ name: 'middle_name', nullable: true })
    public middleName: string;

    @Column({ name: 'last_name', nullable: true })
    public lastName: string;

    @Column()
    public active: boolean;

    @Column()
    public verified: boolean;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
