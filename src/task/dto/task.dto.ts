import { HookDTO } from 'src/hook/dto/hook.dto';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tasks' })
@Index(['createdAt', 'id'])
export class TaskDTO {
    @PrimaryGeneratedColumn('uuid')
    public id: string;

    @Column({
        nullable: true,
        default: null,
    })
    public script: string;

    @Column()
    public props: string;

    @Column({
        nullable: true,
        default: null,
    })
    public template: string;

    @Column({
        name: 'execution_cwd',
        nullable: true,
    })
    public executionCwd: string;

    /**
     * - -3: key pair failure
     * - -2: script-parse-errored
     * - -1: runtime-errored
     * - 1: queueing
     * - 2: waiting
     * - 2: running
     * - 3: done
     */
    @Column({ default: 1 })
    public status: number;

    @ManyToOne(() => HookDTO, (hookDTO) => hookDTO.tasks, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'hook_id' })
    public hook: HookDTO;

    @CreateDateColumn({ name: 'created_at' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    public updatedAt: Date;
}
