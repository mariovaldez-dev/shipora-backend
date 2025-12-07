import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeederService } from './shared/infrastructure/database/seeder.service';

async function bootstrap() {
  console.log('🚀 Starting Shipora Seeder...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seederService = app.get(SeederService);
    await seederService.seed();
    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
