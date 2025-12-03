import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
} from 'class-validator';

export enum Channel {
  email = 'email',
  slack = 'slack',
}

export class CreateChannelDto {
  @IsEnum(Channel) channel!: Channel;
  @IsString() target!: string; // validate email/webhook downstream
  @IsObject() @IsOptional() scope?: any;
  @IsBoolean() @IsOptional() active?: boolean;
}

export class UpdateChannelDto {
  @IsEnum(Channel) @IsOptional() channel?: Channel;
  @IsString() @IsOptional() target?: string;
  @IsObject() @IsOptional() scope?: any;
  @IsBoolean() @IsOptional() active?: boolean;
}

export class CreatePolicyDto {
  @IsString() name!: string;
  @IsObject() rule!: any;
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  channelIds?: string[];
  @IsBoolean() @IsOptional() active?: boolean;
}

export class UpdatePolicyDto {
  @IsString() @IsOptional() name?: string;
  @IsObject() @IsOptional() rule?: any;
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  channelIds?: string[];
  @IsBoolean() @IsOptional() active?: boolean;
}
