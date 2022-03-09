import {
    Controller,
    Get,
    Param,
} from '@nestjs/common';
import { ExecutionService } from './execution.service';

@Controller('/execution')
export class ExecutionController {
    public constructor(
        private readonly executionService: ExecutionService,
    ) {}

    @Get('/:task_id')
    public async getExecutionRecords(@Param('task_id') taskId: string) {
        return await this.executionService.getExecutionRecords(taskId);
    }
}
