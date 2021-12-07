import {
    Injectable,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    ERR_HTTP_MISSING_BODY_PROPERTY,
} from 'src/app.constants';
import { Repository } from 'typeorm';
import { UserDTO } from './dto/user.dto';
import * as _ from 'lodash';
import { UserDAO } from './dao/user.dao';
import { Auth0Service } from 'src/auth0/auth0.service';

@Injectable()
export class UserService {
    public constructor(
        @InjectRepository(UserDTO)
        private readonly userRepository: Repository<UserDTO>,
        private readonly auth0Service: Auth0Service,
    ) {}

    /**
     * create or update the information of a user
     * if user does not exist in database, then it will create a new user entity
     * otherwise it will only update the information of the specified user
     * @param {Partial<UserDTO>} userInformation
     * @returns {Promise<UserDTO>}
     */
    public async syncUserInformation(userInformation: Partial<UserDTO>) {
        if (!userInformation || !userInformation.email) {
            throw new BadRequestException(ERR_HTTP_MISSING_BODY_PROPERTY);
        }

        const currentUserDTO = await this.userRepository.findOne({
            email: userInformation.email,
        });

        const newPartialCurrentUserDTO = _.omit(userInformation, ['id', 'createdAt', 'updatedAt']);

        if (currentUserDTO) {
            await this.userRepository.update(
                {
                    id: currentUserDTO.id,
                },
                newPartialCurrentUserDTO,
            );
            return {
                ...currentUserDTO,
                ...newPartialCurrentUserDTO,
            };
        } else {
            const newUserInformation = this.userRepository.create(userInformation);
            return await this.userRepository.save(newUserInformation);
        }
    }

    /**
     * update user information
     * @param {Partial<UserDTO>} updates
     * @returns {Promise<UserDTO>}
     */
    public async updateUserInformation(openId: string, updates: Partial<UserDAO>) {
        return await this.auth0Service.managementClient.updateUser(
            {
                id: openId,
            },
            _.pick(updates, ['name', 'nickname', 'picture']),
        );
    }
}
