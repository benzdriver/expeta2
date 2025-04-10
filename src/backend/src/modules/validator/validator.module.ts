import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';
import { Validation, ValidationSchema } from './schemas/validation.schema';
import { LlmModule } from '../../services/llm.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Validation.name, schema: ValidationSchema },
    ]),
    LlmModule,
    MemoryModule,
  ],
  controllers: [ValidatorController],
  providers: [ValidatorService],
  exports: [ValidatorService],
})
export class ValidatorModule {}
