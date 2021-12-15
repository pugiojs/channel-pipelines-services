import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
    Strategy as BaseStrategy,
    ExtractJwt,
} from 'passport-jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import * as _ from 'lodash';
import { UserDAO } from 'src/user/dao/user.dao';
import { UtilService } from 'src/util/util.service';
import { UserDTO } from 'src/user/dto/user.dto';
import {
    ERR_AUTH_EMAIL_NOT_VERIFIED,
} from 'src/app.constants';
import * as fs from 'fs-extra';
import { Oauth2Service } from 'src/oauth2/oauth2.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(BaseStrategy) {
    public constructor(
        private readonly configService: ConfigService,
        private readonly utilService: UtilService,
        private readonly oauth2Service: Oauth2Service,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: configService.get<string>('auth.audience'),
            issuer: configService.get<string>('sign.issuer'),
            algorithms: ['RS256'],
            secretOrKey: fs.readFileSync(configService.get<string>('sign.publicKeyPathname')),
        });
    }

    public async validate(payload: JwtPayload) {
        const { sub: id } = payload;

        if (!id || !_.isString(id)) {
            throw new UnauthorizedException();
        }

        const userInfo = await this.oauth2Service
            .getClient()
            .retrieveUser(id)
            .then((response) => response.response?.user);

        if (!userInfo) {
            throw new UnauthorizedException();
        }

        if (_.isBoolean(userInfo.verified) && !userInfo.verified) {
            throw new ForbiddenException(ERR_AUTH_EMAIL_NOT_VERIFIED);
        }

        const currentUserDAO = this.utilService.getUserDAOFromAuth0Response(userInfo);
        const currentUserDTO = this.utilService.transformDAOToDTO<UserDAO, UserDTO>(currentUserDAO);

        return currentUserDTO;
    }
}
