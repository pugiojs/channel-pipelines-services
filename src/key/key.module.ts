import { Module } from '@nestjs/common';
import { KeyService } from './key.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserClientDTO } from 'src/relations/user-client.dto';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserClientDTO,
        ]),
    ],
    providers: [KeyService],
    exports: [KeyService],
})
export class KeyModule {}
