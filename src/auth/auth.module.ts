import {
    Module,
    Global,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { KeyModule } from 'src/key/key.module';
import { ChannelKeyStrategy } from './channel-key.strategy';

@Global()
@Module({
    imports: [
        ConfigModule,
        PassportModule.register({
            defaultStrategy: ['channel-key'],
        }),
        UserModule,
        KeyModule,
    ],
    providers: [
        ChannelKeyStrategy,
        AuthService,
    ],
    exports: [
        PassportModule,
        ChannelKeyStrategy,
        AuthService,
    ],
    controllers: [AuthController],
})
export class AuthModule {}
