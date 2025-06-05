import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, signupSchema } from './dto/signup.dto';
import { ZodValidationPipe } from 'src/common/zod.pipe';
import { Public } from 'src/common/decorator/public-decorator';
import { LoginDto, loginSchema } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('signup')
  @UsePipes(new ZodValidationPipe(signupSchema))
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }
  @Public()
  @Post('login')
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
