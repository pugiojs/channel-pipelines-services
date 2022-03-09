import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
    TransformDTOPipe,
} from 'src/app.pipe';
import { HookDTO } from './dto/hook.dto';
import { HookService } from './hook.service';

@Controller('/hook')
export class HookController {
    public constructor(
        private readonly hookService: HookService,
    ) {}

    @Post('')
    public async createHook(
        @Body('client') clientId: string,
        @Body('data', TransformDTOPipe) data: Partial<HookDTO>,
    ) {
        return await this.hookService.createHook(clientId, data);
    }

    @Get('')
    public async queryHooks(
        @Query('client_id') clientId: string,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('create_date_range', ParseDateRangePipe) createDateRange: TRangeItem[],
    ) {
        return await this.hookService.queryHooks(
            clientId,
            {
                size,
                lastCursor,
                searchContent,
                range: {
                    createdAt: createDateRange,
                },
            },
        );
    }

    @Get('/:hook_id')
    public async getHook(@Param('hook_id') hookId: string) {
        return await this.hookService.getHook(hookId);
    }

    @Delete('/:hook_id?')
    public async deleteOneHook(
        @Body('hooks') hookIdList?: string[],
        @Param('hook_id') hookId?: string,
    ) {
        return await this.hookService.deleteHooks(hookId || hookIdList);
    }

    @Patch('/:hook_id')
    public async updateHook(
        @Param('hook_id') hookId: string,
        @Body('updates', TransformDTOPipe) updates: Partial<HookDTO>,
    ) {
        return await this.hookService.updateHook(hookId, updates);
    }

    @Post('/:hook_id/task')
    public async sendExecutionTask(
        @Param('hook_id') hookId: string,
        @Body() content,
    ) {
        return await this.hookService.sendExecutionTask(hookId, content);
    }
}
