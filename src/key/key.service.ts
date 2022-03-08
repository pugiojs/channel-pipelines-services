import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import * as Crypto from 'crypto-js';

@Injectable()
export class KeyService {
    public async validateChannelKey(encodedChannelKey: string) {
        if (!encodedChannelKey || !_.isString(encodedChannelKey)) {
            return false;
        }

        const [clientId, channelId, channelKey] = Buffer
            .from(encodedChannelKey, 'base64')
            .toString()
            .split(':');

        const relation = await this.channelClientRepository.findOne({
            where: {
                client: {
                    id: clientId,
                },
                channel: {
                    id: channelId,
                },
            },
            relations: ['client', 'channel'],
        });

        if (!relation) {
            return null;
        }

        const { key: channelAesKey } = await this.channelRepository.findOne({
            where: {
                id: relation.channel.id,
            },
            select: ['id', 'key'],
        });

        try {
            const decryptedChannelKey = Crypto
                .AES
                .decrypt(channelKey, channelAesKey)
                .toString(Crypto.enc.Utf8);

            if (decryptedChannelKey !== channelAesKey) {
                return false;
            }

            return relation.channel;
        } catch (e) {
            return false;
        }
    }
}
