import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class Verify2FADto {
    @ApiProperty({ example: '123456' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ example: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    userId: string;
}
