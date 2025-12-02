/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RuleDto {
  @IsString() type!: string;
}

export class CreatePolicyDto {
  @IsString() name!: string;
  @ValidateNested() @Type(() => RuleDto) rule!: RuleDto;
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  channelIds?: string[];
  @IsBoolean() @IsOptional() active?: boolean;
}
