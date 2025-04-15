import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const _app = app.useGlobalPipes(new ValidationPipe());

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const _port = await app.listen(port);
  /* eslint-disable-next-line no-console */
  /* eslint-disable-next-line no-console */
  /* eslint-disable-next-line no-console */
console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
