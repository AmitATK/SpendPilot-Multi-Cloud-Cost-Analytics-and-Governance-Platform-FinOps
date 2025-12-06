import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    }),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allows your Angular app to load assets
    }),
  );
  // Global DTO validation & sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.enableCors({
    origin:
      process.env.NODE_ENV !== 'production'
        ? [
            'http://localhost:4200',
            'http://localhost:5173',
            'http://localhost:8080',
          ]
        : [
            'https://finops-liard.vercel.app',
            'https://spendpilot.onrender.com',
          ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  // Swagger /docs
  const config = new DocumentBuilder()
    .setTitle('FinOps API')
    .setDescription('SpendPilot (FinOps) REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);
  app.use(compression());
  await app.listen(process.env.PORT || 3000);
}
bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { ValidationPipe } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import rateLimit from 'express-rate-limit';
// import helmet from 'helmet';
// import compression from 'compression';
// async function bootstrap() {
//   const app = await NestFactory.create(AppModule, { cors: true });
//   app.use(
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//     rateLimit({
//       windowMs: 15 * 60 * 1000,
//       max: 200,
//       standardHeaders: true,
//       legacyHeaders: false,
//     }),
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-call
//     helmet({
//       crossOriginResourcePolicy: { policy: 'cross-origin' }, // allows your Angular app to load assets
//     }),
//   );
//   // Global DTO validation & sanitization
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: false,
//       transform: true,
//     }),
//   );

//   // Swagger /docs
//   const config = new DocumentBuilder()
//     .setTitle('FinOps API')
//     .setDescription('SpendPilot (FinOps) REST API')
//     .setVersion('1.0.0')
//     .addBearerAuth()
//     .build();
//   const doc = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('docs', app, doc);
//   app.use(compression());
//   await app.listen(process.env.PORT || 3000);
// }
// bootstrap();
