import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ProxyModule } from './proxy/proxy.module';
import { CorsMiddleware } from './middleware/cors.middleware';
import { CookieModule } from './cookie/cookie.module';
import { CookieController } from './cookie/cookie.controller';
import { CookieService } from './cookie/cookie.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
    ProxyModule,
    CookieModule
  ],
  controllers: [CookieController],
  providers: [CookieService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*');
  }
}
