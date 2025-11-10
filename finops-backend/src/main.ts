import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(bodyParser.json({ limit: '2MB' }));

  const config = new DocumentBuilder()
    .setTitle('FinOps API')
    .setDescription('Cloud cost, budgets, anomalies, cleanup')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  await app.listen(3000);
  console.log('API listening on http://localhost:3000 (docs: http://localhost:3000/docs)');
}
bootstrap();
