import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async createHash(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
  private async SignToken(
    id: string,
    username: string,
  ): Promise<{
    accessToken: string;
  }> {
    const payload = {
      id,
      username,
    };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
      secret: 'secret',
    });
    return {
      accessToken: token,
    };
  }

  async signUp(dto: SignUpDto) {
    const { username, email, password } = dto;

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.createHash(password);

    const newUser = await this.prismaService.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return this.SignToken(newUser.id, newUser.username);
  }
  async login(dto: LoginDto) {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: dto.email,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.SignToken(user.id, user.username);
  }
}
