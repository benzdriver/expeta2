import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClarifierModule } from './modules/clarifier/clarifier.module';
import { GeneratorModule } from './modules/generator/generator.module';
import { ValidatorModule } from './modules/validator/validator.module';
import { MemoryModule } from './modules/memory/memory.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { SemanticMediatorModule } from './modules/semantic-mediator/semantic-mediator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/expeta2',
      }),
    }),
    ClarifierModule,
    GeneratorModule,
    ValidatorModule,
    MemoryModule,
    OrchestratorModule,
    SemanticMediatorModule,
  ],
})
export class AppModule {}
