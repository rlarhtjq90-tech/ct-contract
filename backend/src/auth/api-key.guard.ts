import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/** 사람 로그인(JWT) 없이 서버간(그룹웨어 동기화 봇) 호출을 인증하는 가드. */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-api-key'];
    const expected = process.env.GROUPWARE_INGEST_API_KEY;
    if (!expected || key !== expected) {
      throw new UnauthorizedException('유효하지 않은 API 키입니다.');
    }
    return true;
  }
}
