import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { TRangeItem } from 'src/app.interfaces';
import {
    ParseDateRangePipe,
    PermanentlyParseIntPipe,
} from 'src/app.pipe';
import { CurrentClient } from 'src/client/client.decorator';
import { ClientDTO } from 'src/client/dto/client.dto';
import { UserDTO } from 'src/user/dto/user.dto';
import { CurrentUser } from 'src/user/user.decorator';
import { TaskService } from './task.service';

@Controller('/task')
export class TaskController {
    public constructor(
        private readonly taskService: TaskService,
    ) {}

    @Get('/consume')
    public async consumeExecutionTask(
        @CurrentUser() user: UserDTO,
        @CurrentClient() client: ClientDTO,
        @Query('all', PermanentlyParseIntPipe) all = 0,
        @Query('lock_pass') lockPass = '',
    ) {
        return await this.taskService.consumeExecutionTasks(user, client, all, lockPass);
    }

    @Get('/:task_id')
    public async getTask(@Param('task_id') taskId: string) {
        return await this.taskService.getTask(taskId);
    }

    @Get('')
    public async queryTasks(
        @Query('client_id') clientId: string,
        @Query('size', PermanentlyParseIntPipe) size = 10,
        @Query('search') searchContent: string,
        @Query('last_cursor') lastCursor: string,
        @Query('create_date_range', ParseDateRangePipe) createDateRange: TRangeItem[],
    ) {
        return await this.taskService.queryTasks(
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

    @Post('/:task_id/execution')
    public async pushTaskExecution(
        @Param('task_id') taskId: string,
        @Body('sequence', PermanentlyParseIntPipe) sequence = -1,
        @Body('status') status?: number,
        @Body('content') content?: string,
    ) {
        return await this.taskService.pushTaskExecution(
            taskId,
            sequence,
            status,
            content,
        );
    }
}
