import { Module } from '@nestjs/common';
import { HookController } from './hook.controller';
import { HookService } from './hook.service';

@Module({
    controllers: [HookController],
    providers: [HookService],
    exports: [HookService],
})
export class HookModule {}
