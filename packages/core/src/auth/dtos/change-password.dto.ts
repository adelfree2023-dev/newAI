import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({ example: 'oldPassword123' })
    @IsString()
    @MinLength(8)
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({ example: 'newPassword123' })
    @IsString()
    @MinLength(8)
    @IsNotEmpty()
    newPassword: string;
}
