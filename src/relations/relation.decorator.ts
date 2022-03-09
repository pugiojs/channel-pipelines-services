import * as _ from 'lodash';
import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';
import { UserClientDTO } from 'src/relations/user-client.dto';

export const CurrentRelation = createParamDecorator(
    (data: string, context: ExecutionContext): UserClientDTO => {
        const relation = context.switchToHttp().getRequest()['pugio_context'] as UserClientDTO;

        if (!relation) {
            return null;
        }

        return relation;
    },
);
