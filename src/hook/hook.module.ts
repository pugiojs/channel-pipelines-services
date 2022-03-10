import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientModule } from 'src/client/client.module';
import { TaskDTO } from 'src/task/dto/task.dto';
import { HookDTO } from './dto/hook.dto';
import { HookController } from './hook.controller';
import { HookService } from './hook.service';

@Module({
    imports: [
        ClientModule,
        ConfigModule,
        TypeOrmModule.forFeature([
            HookDTO,
            TaskDTO,
        ]),
    ],
    controllers: [HookController],
    providers: [HookService],
    exports: [HookService],
})
export class HookModule {}
