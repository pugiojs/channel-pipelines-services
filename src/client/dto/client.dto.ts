import { HookDTO } from 'src/hook/dto/hook.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'clients' })
@Index(['createdAt', 'id'])
export class ClientDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column()
    public name: string;

    @Column({
        nullable: true,
    })
    public description: string;

    @Column({ default: true })
    public verified: boolean;

    @Column({ default: '1.0.0' })
    public version: string;

    @OneToMany(
        () => UserClientDTO,
        (userClientDTO) => userClientDTO.client,
    )
    public clientUsers: UserClientDTO[];

    @OneToMany(() => HookDTO, (hookDTO) => hookDTO.client)
    public hooks: HookDTO[];

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
