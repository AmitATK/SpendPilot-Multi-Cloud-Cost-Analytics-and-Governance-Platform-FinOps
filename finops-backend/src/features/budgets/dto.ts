import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

export class UpsertBudgetDto {
  @IsString() name!: string;

  @IsObject()
  @IsOptional()
  scope?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  monthlyLimit?: number;

  @IsNumber()
  @IsOptional()
  monthly_limit?: number;

  @IsArray()
  @ArrayMaxSize(6)
  @ArrayMinSize(1)
  @IsOptional()
  thresholds?: number[];

  @IsString()
  @IsOptional()
  currency?: string;
}
