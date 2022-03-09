import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpException,
    InternalServerErrorException,
    ForbiddenException,
} from '@nestjs/common';
import * as _ from 'lodash';
import { Observable } from 'rxjs';
import {
    catchError,
    map,
} from 'rxjs/operators';
import { ERR_HTTP_SERVER_ERROR } from './app.constants';
import { ClientService } from './client/client.service';
import { UserClientDTO } from './relations/user-client.dto';
import { UserService } from './user/user.service';
import { UtilService } from './util/util.service';

export type Response = Record<string, any>;

@Injectable()
export class AppInterceptor<T> implements NestInterceptor<T, Response> {
    public constructor(
        private readonly utilService: UtilService,
        private readonly clientService: ClientService,
        private readonly userService: UserService,
    ) {}

    public async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<Response>> {
        const request = context.switchToHttp().getRequest();

        const encryptedContext = request.headers['X-Pugio-Context'.toLowerCase()];

        const relation: UserClientDTO = this.utilService.decryptContext(encryptedContext);

        if (!relation) {
            throw new ForbiddenException();
        }

        request['pugio_context'] = relation;

        this.userService.syncUserInformation(relation.user);
        this.clientService.syncClientInformation(relation.client);
        this.clientService.syncUserClientRelation(relation.user.id, relation.client.id, relation);

        return next.handle().pipe(
            catchError((e) => {
                if (e instanceof HttpException) {
                    throw e;
                } else {
                    throw new InternalServerErrorException(
                        ERR_HTTP_SERVER_ERROR,
                        e.message || e.toString(),
                    );
                }
            }),
            map((data) => {
                return this.utilService.transformDTOToDAO(data);
            }),
        );
    }
}
