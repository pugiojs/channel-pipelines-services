import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import { UtilService } from 'src/util/util.service';
import { TaskGateway } from './task.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import {
    In,
    Repository,
} from 'typeorm';
import { TaskDTO } from './dto/task.dto';
import { ClientDTO } from 'src/client/dto/client.dto';
import * as _ from 'lodash';
import * as yup from 'yup';
import { ExecutionDTO } from 'src/execution/dto/execution.dto';
import { ClientService } from 'src/client/client.service';
import { UserDTO } from 'src/user/dto/user.dto';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';

@Injectable()
export class TaskService {
    private redisClient: Redis;

    public constructor(
        private readonly taskGateway: TaskGateway,
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        private readonly clientService: ClientService,
        @InjectRepository(TaskDTO)
        private readonly taskRepository: Repository<TaskDTO>,
        @InjectRepository(ExecutionDTO)
        private readonly executionRepository: Repository<ExecutionDTO>,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
    ) {
        this.redisClient = this.redisService.getClient();
    }

    public async consumeExecutionTasks(
        user: UserDTO,
        client: ClientDTO,
        all: number,
        singleLockPass: string,
    ) {
        const permission = await this.clientService.checkPermission({
            userId: user.id,
            clientId: client.id,
        });

        if (!permission) {
            throw new ForbiddenException();
        }

        const taskQueueName = this.utilService.generateExecutionTaskQueueName(client.id);
        let taskIdList: string[] = [];

        if (all === 1) {
            const {
                data: lockPass,
            } = await this.clientService.lockExecutionTaskChannel(client.id);

            const unconsumedTaskIdList = await this.redisClient.LPOP_COUNT(
                taskQueueName,
                await this.redisClient.LLEN(taskQueueName),
            );

            taskIdList = taskIdList.concat(unconsumedTaskIdList);

            await this.clientService.unlockExecutionTaskChannel(client.id, lockPass);
        } else {
            taskIdList.push(await this.redisClient.LPOP(taskQueueName));

            if (!_.isString(singleLockPass)) {
                throw new BadRequestException();
            }

            await this.clientService.unlockExecutionTaskChannel(client.id, singleLockPass);
        }

        const tasks = await this.taskRepository.find({
            where: {
                id: In(taskIdList),
                status: 1,
                hook: {
                    client: {
                        id: client.id,
                    },
                },
            },
            select: [
                'id',
                'script',
                'hook',
            ],
            relations: ['hook'],
        });

        if (tasks.length === 0) {
            return [];
        }

        const result = [];

        for (const task of tasks) {
            let status = 2;

            const {
                id,
                script,
                hook,
            } = task;
            const {
                executionCwd,
                preCommandSegment,
                postCommandSegment,
            } = hook;

            const executionConfig = {
                script,
                preCommandSegment,
                postCommandSegment,
            };

            let executionData;

            try {
                executionData = JSON.stringify(executionConfig);
            } catch (e) {
                status = -3;
            }

            await this.taskRepository.update({ id }, { status });

            if (status === 2) {
                result.push({
                    id,
                    executionCwd,
                    executionData,
                });
            }
        }

        return result;
    }

    public async pushTaskExecution(
        taskId: string,
        sequence = -1,
        status = 3,
        content = '',
    ) {
        let currentStatus = status;

        const schema = yup.object().shape({
            taskId: yup.string().required(),
            sequence: yup.number().optional(),
            status: yup.number().moreThan(-5).lessThan(5).optional(),
            content: yup.string().optional().nullable(),
        });

        if (
            (status === 3 && sequence < 0) ||
            !(await schema.isValid({ taskId, sequence, status, content }))
        ) {
            throw new BadRequestException();
        }

        const task = await this.taskRepository.findOne({
            where: {
                id: taskId,
            },
            select: ['id', 'executions', 'status'],
        });

        if (!task) {
            throw new NotFoundException();
        }

        if (
            currentStatus < 0 ||
            (task.status < 3 && task.status > 0 && currentStatus === 3) ||
            (task.status === 3 && currentStatus > 3)
        ) {
            task.status = currentStatus;
            await this.taskRepository.save(task);
        }

        let executionRecord = await this.executionRepository.findOne({
            where: {
                task: {
                    id: taskId,
                },
                sequence,
            },
        });

        if (!executionRecord && sequence > 0) {
            executionRecord = await this.executionRepository.save(
                this.executionRepository.create({
                    task: {
                        id: taskId,
                    },
                    content,
                    sequence,
                }),
            );

            try {
                this.taskGateway.server.to(taskId).emit(
                    'execution',
                    _.omit(executionRecord, ['task']),
                );
            } catch (e) {}
        }

        if (!executionRecord) {
            return;
        }

        return _.omit(executionRecord, ['task', 'sequence', 'content']);
    }

    public async getTask(taskId: string) {
        if (!taskId || !_.isString(taskId)) {
            throw new BadRequestException();
        }

        return await this.taskRepository.findOne({
            where: {
                id: taskId,
            },
        });
    }

    public async queryTasks(
        clientId: string,
        queryOptions: PaginationQueryServiceOptions<TaskDTO>,
    ) {
        const result = await this.utilService.queryWithPagination({
            ...queryOptions,
            repository: this.taskRepository,
            searchKeys: [
                'id',
                'props',
            ],
            queryOptions: {
                where: {
                    hook: {
                        client: {
                            id: clientId,
                        },
                    },
                },
                relations: ['hook', 'hook.client'],
            },
        });

        return result;
    }
}
