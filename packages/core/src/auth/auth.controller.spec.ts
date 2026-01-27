import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    let controller: AuthController;
    let service: jest.Mocked<AuthService>;

    beforeEach(async () => {
        const mockAuthService = {
            login: jest.fn(),
            register: jest.fn(),
            validateUser: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        service = module.get(AuthService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('login', () => {
        it('should return login result', async () => {
            const mockUser = { email: 'a@b.c' } as any;
            service.login.mockResolvedValue({ accessToken: 'token' });
            const result = await controller.login({} as any, { user: mockUser } as any);
            expect(result).toEqual({ accessToken: 'token' });
        });
    });
});
