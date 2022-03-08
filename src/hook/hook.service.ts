import {
    Redis,
    RedisService,
} from '@lenconda/nestjs-redis';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientService } from 'src/client/client.service';
import { TaskDTO } from 'src/task/dto/task.dto';
import { UtilService } from 'src/util/util.service';
import {
    In,
    Repository,
} from 'typeorm';
import { HookDTO } from './dto/hook.dto';
import * as Handlebars from 'handlebars';
import * as _ from 'lodash';
import { PaginationQueryServiceOptions } from 'src/app.interfaces';

@Injectable()
export class HookService {
    private redisClient: Redis;

    public constructor(
        private readonly utilService: UtilService,
        private readonly redisService: RedisService,
        private readonly clientService: ClientService,
        @InjectRepository(TaskDTO)
        private readonly taskRepository: Repository<TaskDTO>,
        @InjectRepository(HookDTO)
        private readonly hookRepository: Repository<HookDTO>,
    ) {
        this.redisClient = this.redisService.getClient();
    }

    public async createHook(clientId: string, data: Partial<HookDTO>) {
        const hookData = _.pick(
            data,
            [
                'name',
                'description',
                'mapper',
                'preCommandSegment',
                'postCommandSegment',
                'template',
                'executionCwd',
            ],
        );

        const hook = await this.hookRepository.save(
            this.hookRepository.create({
                ...hookData,
                client: {
                    id: clientId,
                },
            }),
        );

        return _.omit(hook, ['client']);
    }

    public async updateHook(hookId: string, updates: Partial<HookDTO>) {
        const hook = await this.hookRepository.findOne({
            where: {
                id: hookId,
            },
        });

        const updateData = _.pick(updates, [
            'name',
            'description',
            'mapper',
            'preCommandSegment',
            'postCommandSegment',
            'template',
            'executionCwd',
        ]);

        const result = await this.hookRepository.save(_.merge(hook, updateData));

        return result;
    }

    public async deleteHooks(hookIdOrList: string | string[]) {
        if (
            !hookIdOrList ||
            (!_.isArray(hookIdOrList) && !_.isString(hookIdOrList))
        ) {
            return [];
        }

        const hookIdList = (
            _.isArray(hookIdOrList)
                ? hookIdOrList
                : [hookIdOrList]
        ).filter((hookId) => _.isString(hookId));

        const hooks = await this.hookRepository.find({
            where: {
                id: In(hookIdList),
            },
        });

        if (hooks.length !== 0) {
            await this.hookRepository.delete(hooks.map((hook) => hook.id));
        }

        return hooks;
    }

    public async queryHooks(
        clientId: string,
        queryOptions: PaginationQueryServiceOptions<HookDTO>,
    ) {
        const result = await this.utilService.queryWithPagination({
            ...queryOptions,
            repository: this.hookRepository,
            searchKeys: [
                'id',
                'name',
                'description',
                'template',
                'postCommandSegment',
                'preCommandSegment',
                'executionCwd',
            ],
            queryOptions: {
                where: {
                    client: {
                        id: clientId,
                    },
                },
            },
        });

        return result;
    }

    public async getHook(hookId: string) {
        if (!hookId || !_.isString(hookId)) {
            throw new BadRequestException();
        }

        return await this.hookRepository.findOne({
            where: {
                id: hookId,
            },
        });
    }

    public async sendExecutionTask(hookId: string, props: Record<string, any> = {}) {
        const hook = await this.hookRepository
            .createQueryBuilder('hook')
            .leftJoinAndSelect('hook.client', 'client')
            .addSelect('client.publicKey')
            .where('hook.id = :hookId', { hookId })
            .getOne();

        if (!hook || !hook.client) {
            throw new NotFoundException();
        }

        let taskStatus = 1;

        const {
            id: clientId,
        } = hook.client;

        const clientTaskQueueName = this.utilService.generateExecutionTaskQueueName(clientId);

        await this.redisClient.persist(clientTaskQueueName);

        let gotLock = false;

        const {
            error,
            data: lockPass,
        } = await this.clientService.lockExecutionTaskChannel(clientId);

        if (!error && _.isString(lockPass)) {
            gotLock = true;
        }

        if (error || !gotLock) {
            taskStatus = -4;
        }

        const {
            template,
        } = hook;

        let scriptContent: string = null;

        if (_.isString(template)) {
            try {
                const render = Handlebars.compile(template);
                scriptContent = render(props);
            } catch (e) {
                taskStatus = -2;
            }
        }

        const newTask = await this.taskRepository.save(
            this.taskRepository.create({
                script: scriptContent,
                status: taskStatus,
                props: JSON.stringify(props),
                hook: {
                    id: hookId,
                },
            }),
        );

        if (taskStatus < 0) {
            return newTask;
        }

        await this.redisClient.RPUSH(
            clientTaskQueueName,
            newTask.id,
        );

        // TODO
        // await this.clientService.requestClientChannel({
        //     clientId,
        //     scope: 'pugio.pipelines',
        //     requestBody: {
        //         lockPass,
        //     },
        // });

        return _.omit(newTask, ['hook']);
    }
}
