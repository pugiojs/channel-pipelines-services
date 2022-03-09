import * as _ from 'lodash';
import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserClientDTO } from 'src/relations/user-client.dto';

export const CurrentClient = createParamDecorator(
    (data: string, context: ExecutionContext): ClientDTO => {
        const relation = context.switchToHttp().getRequest()['pugio_context'] as UserClientDTO;

        if (!relation || !relation.client) {
            return null;
        }

        return relation.client;
    },
);
