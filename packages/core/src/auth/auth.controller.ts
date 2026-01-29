import { Controller, Post, Body, UseGuards, Request, Get, Put, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { Verify2FADto } from './dtos/verify-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'تسجيل مستخدم جديد' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @ApiOperation({ summary: 'تسجيل الدخول' })
    async login(@Body() loginDto: LoginDto, @Request() req) {
        loginDto.ipAddress = req.ip;
        loginDto.userAgent = req.headers['user-agent'];
        return this.authService.login(loginDto);
    }

    @Post('verify-2fa')
    @ApiOperation({ summary: 'التحقق من المصادقة الثنائية' })
    async verify2FA(@Body() verifyDto: Verify2FADto) {
        return this.authService.verify2FA(verifyDto);
    }

    @Post('2fa/enable')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'تفعيل المصادقة الثنائية' })
    async enable2FA(@Request() req) {
        return this.authService.enable2FA(req.user.userId);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'تجديد توكن الوصول' })
    async refresh(@Body('refreshToken') refreshToken: string) {
        if (!refreshToken) throw new BadRequestException('يجب توفير توكن التجديد');
        return this.authService.refreshToken(refreshToken);
    }

    @Post('logout')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'تسجيل الخروج' })
    async logout(@Request() req) {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const refreshToken = req.body.refreshToken;
        await this.authService.logout(accessToken, refreshToken);
        return { message: 'تم تسجيل الخروج بنجاح' };
    }

    @Post('logout-all')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'تسجيل الخروج من جميع الأجهزة' })
    async logoutAll(@Request() req) {
        await this.authService.logoutAll(req.user.userId);
        return { message: 'تم تسجيل الخروج من جميع الأجهزة بنجاح' };
    }

    @Put('change-password')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'تغيير كلمة المرور' })
    async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
        await this.authService.changePassword(req.user.userId, changePasswordDto);
        return { message: 'تم تغيير كلمة المرور بنجاح' };
    }

    @Get('me')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'الحصول على معلومات المستخدم الحالي' })
    async getProfile(@Request() req) {
        return { user: req.user };
    }
}
