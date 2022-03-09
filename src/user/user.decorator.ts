import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { UserDTO } from './dto/user.dto';
import * as _ from 'lodash';
import { UserClientDTO } from 'src/relations/user-client.dto';

export const CurrentUser = createParamDecorator(
    (data: string, context: ExecutionContext): UserDTO => {
        const relation = context.switchToHttp().getRequest()['pugio_context'] as UserClientDTO;

        if (!relation || !relation.user) {
            return null;
        }

        return relation.user;
    },
);
