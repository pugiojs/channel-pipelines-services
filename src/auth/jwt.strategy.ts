import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
    Strategy as BaseStrategy,
    ExtractJwt,
} from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as _ from 'lodash';
import { UserService } from '../user/user.service';
import { UserDAO } from 'src/user/dao/user.dao';
import { UtilService } from 'src/util/util.service';
import { UserDTO } from 'src/user/dto/user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    private userInfoMap = {
        name: 'name',
        nickname: 'nickname',
        picture: 'picture',
        user_id: 'open_id',
        email: 'email',
        email_verified: 'email_verified',
        created_at: 'created_at',
        updated_at: 'updated_at',
    };

    public constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly utilService: UtilService,
    ) {
        super({
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `https://${configService.get<string>(
                    'auth.domain',
                )}/.well-known/jwks.json`,
            }),

            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: configService.get<string>('auth.audience'),
            issuer: `https://${configService.get<string>('auth.domain')}/`,
            algorithms: ['RS256'],
        });
    }

    public validate(payload: JwtPayload) {
        const { sub: id } = payload;

        if (!id || !_.isString(id)) {
            throw new UnauthorizedException();
        }

        const userinfoTag = this.configService.get('auth.userinfoTag');
        const userinfo = payload[userinfoTag];
        const permissions = payload['permissions'] || [];

        if (!userinfo) {
            throw new UnauthorizedException();
        }

        const user = Object.keys(this.userInfoMap).reduce((result, currentKey) => {
            const currentKeyName = this.userInfoMap[currentKey];
            const currentValue = userinfo[currentKey];
            if (!_.isNull(currentValue) || !_.isUndefined(currentValue)) {
                result[currentKeyName] = currentValue;
            }
            return result;
        }, {} as UserDAO);

        const currentUserDTO = this.utilService.transformDAOToDTO<UserDAO, UserDTO>(user);
        this.userService.syncUserInformation(_.omit(currentUserDTO, ['createdAt', 'updatedAt']));

        return { ...user, permissions };
    }
}
