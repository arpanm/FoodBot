import { IsEnum, IsNotEmpty, IsObject, IsString } from 'class-validator';
import { JobAction } from '../../../entities/agent-job.entity';

export class CreateJobDto {
  @IsEnum(JobAction)
  @IsNotEmpty()
  action: JobAction;

  @IsString()
  @IsNotEmpty()
  platform: string;

  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;
}
