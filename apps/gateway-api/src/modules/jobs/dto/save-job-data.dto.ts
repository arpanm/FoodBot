import { IsObject, IsNotEmpty } from 'class-validator';

export class SaveJobDataDto {
  @IsObject()
  @IsNotEmpty()
  result: Record<string, any>;
}
