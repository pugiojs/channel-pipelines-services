import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import {
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { KeyService } from 'src/key/key.service';
import * as _ from 'lodash';

@Injectable()
export class ChannelKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'channel-key') {
    public constructor(
        private readonly keyService: KeyService,
    ) {
        super(
            {
                header: 'CHANNEL-KEY',
                prefix: '',
                property: 'channel',
            },
            true,
            async (encodedChannelKey, done) => {
                try {
                    const channel = await this.keyService.validateChannelKey(encodedChannelKey);

                    if (_.isBoolean(channel)) {
                        return done(null, false);
                    } else {
                        if (!channel) {
                            return done(new ForbiddenException());
                        } else {
                            return done(null, channel);
                        }
                    }
                } catch (error) {
                    return done(error);
                }
            },
        );
    }
}
