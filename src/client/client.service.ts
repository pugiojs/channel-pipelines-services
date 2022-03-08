import {
    BadRequestException,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { UtilService } from 'src/util/util.service';
import { LockerService } from 'src/locker/locker.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';
import * as _ from 'lodash';
import {
    ERR_CLIENT_UNVERIFIED,
    ERR_CLIENT_VERSION_NOT_SUPPORT,
    ERR_HTTP_MISSING_BODY_PROPERTY,
} from 'src/app.constants';
import * as semver from 'semver';
import { ClientDTO } from './dto/client.dto';

@Injectable()
export class ClientService {
    public constructor(
        private readonly utilService: UtilService,
        private readonly lockerService: LockerService,
        @InjectRepository(ClientDTO)
        private readonly clientRepository: Repository<ClientDTO>,
        @InjectRepository(UserClientDTO)
        private readonly userClientRepository: Repository<UserClientDTO>,
    ) {}

    public async lockExecutionTaskChannel(clientId: string, retryTimes?: number) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.lock(lockName, clientId, retryTimes);
    }

    public async unlockExecutionTaskChannel(clientId: string, value: string) {
        const lockName = this.utilService.generateExecutionTaskLockName(clientId);
        return await this.lockerService.unlock(lockName, value);
    }

    public async checkPermission(
        {
            userId,
            clientId,
            permission = -1,
            checkDeviceId = false,
            version = [],
        }: {
            userId: string,
            clientId: string,
            permission?: number | number[],
            checkDeviceId?: boolean,
            version?: string | string[],
        },
    ) {
        const relations = await this.userClientRepository
            .find({
                where: {
                    user: {
                        id: userId,
                    },
                    client: {
                        id: clientId,
                    },
                },
                relations: ['client'],
            });

        if (relations.length === 0) {
            return false;
        }

        if (
            checkDeviceId &&
            relations.some((relation) => !relation.client.verified)
        ) {
            throw new ForbiddenException(ERR_CLIENT_UNVERIFIED);
        }

        if (_.isString(version) || (_.isArray(version) && version.length > 0)) {
            let compareType: string;
            let minVersion: string;
            let maxVersion: string;
            let canUse = true;

            if (_.isString(version)) {
                compareType = 'gte';
                minVersion = version;
            } else if (_.isArray(version)) {
                const [min, max] = version;
                if (_.isString(min) && _.isString(max)) {
                    compareType = 'between';
                    minVersion = min;
                    maxVersion = max;
                } else if (_.isString(min) && !_.isString(max)) {
                    compareType = 'gte';
                    minVersion = min;
                } else if (!_.isString(min) && _.isString(max)) {
                    compareType = 'lte';
                    maxVersion = max;
                }
            }

            if (!compareType) {
                return canUse;
            }

            canUse = relations.some((relation) => {
                const clientVersion = relation.client.version;

                switch (compareType) {
                    case 'gte': {
                        return semver.gte(clientVersion, minVersion);
                    }
                    case 'lte': {
                        return semver.lte(clientVersion, maxVersion);
                    }
                    case 'between': {
                        return semver.gte(clientVersion, minVersion) && semver.lte(clientVersion, maxVersion);
                    }
                    default: {
                        return true;
                    }
                }
            });

            if (!canUse) {
                throw new ForbiddenException(ERR_CLIENT_VERSION_NOT_SUPPORT);
            }
        }

        if (permission === -1) {
            return true;
        }

        const permissionList = _.isNumber(permission)
            ? [permission]
            : permission;

        return relations.some((relation) => permissionList.indexOf(relation.roleType) !== -1);
    }

    public async syncClientInformation(client: ClientDTO) {
        if (!client || !client.id) {
            throw new BadRequestException(ERR_HTTP_MISSING_BODY_PROPERTY);
        }

        const currentClientDTO = await this.clientRepository.findOne({
            id: client.id,
        });

        const newPartialCurrentUserDTO = _.omit(
            client,
            [
                'id',
                'createdAt',
                'updatedAt',
            ],
        );

        let data;

        if (currentClientDTO) {
            await this.clientRepository.update(
                {
                    id: currentClientDTO.id,
                },
                newPartialCurrentUserDTO,
            );
            data = {
                ...currentClientDTO,
                ...newPartialCurrentUserDTO,
            };
        } else {
            const newClient = this.clientRepository.create(
                _.omit(
                    client,
                    [
                        'createdAt',
                        'updatedAt',
                    ],
                ),
            );
            data = await this.clientRepository.save(newClient);
        }

        return data;
    }

    public async syncUserClientRelation(userId: string, clientId: string, props: Partial<UserClientDTO>) {
        const updates = _.pick(props, ['roleType']);

        const existedRelation = await this.userClientRepository.findOne({
            where: {
                user: {
                    id: userId,
                },
                client: {
                    id: clientId,
                },
            },
            relations: ['user', 'client'],
        });

        let data: Partial<UserClientDTO>;

        if (existedRelation) {
            data = _.pick(
                _.merge(existedRelation, data),
                [
                    'roleType',
                ],
            );
        } else {
            data = this.userClientRepository.create({
                user: {
                    id: userId,
                },
                client: {
                    id: clientId,
                },
                ...updates,
            });
        }

        return _.omit(await this.userClientRepository.save(data), ['user', 'client']);
    }
}
