import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockerModule } from 'src/locker/locker.module';
import { UserClientDTO } from 'src/relations/user-client.dto';
import { ClientGateway } from './client.gateway';
import { ClientService } from './client.service';
import { ClientDTO } from './dto/client.dto';

@Module({
    imports: [
        LockerModule,
        TypeOrmModule.forFeature([
            UserClientDTO,
            ClientDTO,
        ]),
    ],
    providers: [ClientService, ClientGateway],
    exports: [ClientService, ClientGateway],
})
export class ClientModule {}
