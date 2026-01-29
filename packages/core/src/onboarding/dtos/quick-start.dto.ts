import { IsString, IsEmail, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuickStartDto {
    @ApiProperty({ example: 'Acme Luxury', description: 'اسم المتجر' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 100)
    storeName: string;

    @ApiProperty({ example: 'acme', description: 'النطاق الفرعي (Slug)' })
    @IsString()
    @IsNotEmpty()
    @Length(3, 50)
    @Matches(/^[a-z0-9-]+$/, { message: 'يجب أن يحتوي النطاق على أحرف إنجليزية صغيرة وأرقام وعلامة (-) فقط' })
    domain: string;

    @ApiProperty({ example: 'owner@example.com', description: 'البريد الإلكتروني للمدير' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'Secure@2026', description: 'كلمة المرور' })
    @IsString()
    @IsNotEmpty()
    @Length(8, 100)
    password: string;

    @ApiProperty({ example: 'RETAIL', description: 'نوع النشاط' })
    @IsString()
    @IsNotEmpty()
    businessType: string;
}
